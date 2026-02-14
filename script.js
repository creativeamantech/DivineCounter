const audioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext))
    ? new (window.AudioContext || window.webkitAudioContext)()
    : {
        state: 'suspended',
        resume: () => {},
        createOscillator: () => ({
            frequency: { setValueAtTime: () => {} },
            connect: () => {},
            start: () => {},
            stop: () => {},
            type: 'sine'
        }),
        createGain: () => ({
            gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            connect: () => {}
        }),
        currentTime: 0,
        destination: {}
    };

const sounds = {
    tap: () => {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    },
    mala: () => {
        const freqs = [329.63, 415.30, 493.88];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.frequency.setValueAtTime(f, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 2.0);
            }, i * 200);
        });
    }
};

const app = {
    data: { mantras: [], activeId: null, theme: 'dark' },
    pendingDeleteId: null,
    pendingResetId: null,
    pendingResetRoundsId: null,
    pendingEditGoalId: null,

    init() {
        const saved = localStorage.getItem('divine_final_v20');
        if (saved) { try { this.data = JSON.parse(saved); } catch(e) {} }

        if (!this.data.mantras || this.data.mantras.length === 0) {
            this.data.mantras = [this.newMantraObject("Om Namah Shivaya", 108)];
            this.data.activeId = this.data.mantras[0].id;
        }

        // AUTO-RESET LOGIC
        const today = new Date().toISOString().split('T')[0];
        let resetTriggered = false;
        this.data.mantras.forEach(m => {
            if (m.lastActive && m.lastActive !== today) {
                if (m.session > 0) resetTriggered = true;
                m.session = 0;
            }
            m.lastActive = today;
        });

        if (this.data.theme === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('theme-icon-sun').classList.remove('hidden');
            document.getElementById('theme-icon-moon').classList.add('hidden');
        }

        if (resetTriggered) {
            this.save();
            this.showToast("New Day: Sessions Reset");
        }

        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'Enter') && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault(); this.increment();
            }
        });

        this.render();
    },

    toggleTheme() {
        this.data.theme = this.data.theme === 'dark' ? 'light' : 'dark';
        document.body.classList.toggle('light-mode');
        document.getElementById('theme-icon-sun').classList.toggle('hidden');
        document.getElementById('theme-icon-moon').classList.toggle('hidden');
        this.save(); this.render();
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.add('visible');
        setTimeout(() => t.classList.remove('visible'), 2500);
    },

    save() { localStorage.setItem('divine_final_v20', JSON.stringify(this.data)); },

    newMantraObject(name, goal) {
        const today = new Date().toISOString().split('T')[0];
        return {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            name: name || "Mantra",
            goal: parseInt(goal) || 108,
            session: 0,
            total: 0,
            history: {},
            lastActive: today
        };
    },

    getActive() { return this.data.mantras.find(m => m.id === this.data.activeId) || this.data.mantras[0]; },

    increment() {
        const m = this.getActive();
        if (!m) return;

        const today = new Date().toISOString().split('T')[0];
        if (m.lastActive && m.lastActive !== today) { m.session = 0; }

        m.session++;
        m.total++;
        m.lastActive = today;
        m.history[today] = (m.history[today] || 0) + 1;

        sounds.tap();
        if (m.session % 108 === 0) {
            sounds.mala(); this.visualFeedback();
            if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
        } else if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        this.save(); this.render();
    },

    resetRounds(id, event) {
        if (event) event.stopPropagation();
        if (this.pendingResetRoundsId === id) {
            const m = this.data.mantras.find(x => x.id === id);
            m.session = 0;
            this.pendingResetRoundsId = null;
            this.showToast(`Daily Round Reset`);
            this.save(); this.render();
        } else {
            this.pendingResetRoundsId = id;
            this.pendingDeleteId = this.pendingResetId = this.pendingEditGoalId = null;
            this.render();
            setTimeout(() => { if(this.pendingResetRoundsId === id) { this.pendingResetRoundsId = null; this.render(); } }, 3000);
        }
    },

    resetTotalOnly(id, event) {
        if (event) event.stopPropagation();
        if (this.pendingResetId === id) {
            const m = this.data.mantras.find(x => x.id === id);
            m.total = 0;
            this.pendingResetId = null;
            this.showToast(`Lifetime Total Reset`);
            this.save(); this.render();
        } else {
            this.pendingResetId = id;
            this.pendingDeleteId = this.pendingResetRoundsId = this.pendingEditGoalId = null;
            this.render();
            setTimeout(() => { if(this.pendingResetId === id) { this.pendingResetId = null; this.render(); } }, 3000);
        }
    },

    startEditGoal(id, event) {
        if (event) event.stopPropagation();
        this.pendingEditGoalId = id;
        this.pendingDeleteId = this.pendingResetId = this.pendingResetRoundsId = null;
        this.render();
    },

    saveEditGoal(id, event) {
        if (event) event.stopPropagation();
        const newVal = parseInt(document.getElementById(`edit-goal-${id}`).value);
        if (newVal > 0) {
            this.data.mantras.find(m => m.id === id).goal = newVal;
            this.pendingEditGoalId = null;
            this.showToast(`Goal Updated: ${newVal}`);
            this.save(); this.render();
        }
    },

    addNewMantra() {
        const ni = document.getElementById('new-mantra-name');
        const gi = document.getElementById('new-mantra-goal');
        if (!ni.value.trim()) return;
        const obj = this.newMantraObject(ni.value.trim(), gi.value);
        this.data.mantras.push(obj);
        this.data.activeId = obj.id;
        ni.value = ""; this.showToast("Practice Initialized");
        this.save(); this.render();
    },

    deleteMantra(id, event) {
        if (event) event.stopPropagation();
        if (this.data.mantras.length <= 1) return this.showToast("1 Required");
        if (this.pendingDeleteId === id) {
            this.data.mantras = this.data.mantras.filter(m => m.id !== id);
            if (this.data.activeId === id) this.data.activeId = this.data.mantras[0].id;
            this.pendingDeleteId = null;
            this.showToast("Mantra Removed");
            this.save(); this.render();
        } else {
            this.pendingDeleteId = id;
            this.pendingResetId = this.pendingResetRoundsId = this.pendingEditGoalId = null;
            this.render();
            setTimeout(() => { if(this.pendingDeleteId === id) { this.pendingDeleteId = null; this.render(); } }, 3000);
        }
    },

    setActive(id) {
        if (this.pendingDeleteId || this.pendingResetId || this.pendingResetRoundsId || this.pendingEditGoalId) return;
        this.data.activeId = id;
        this.save();
        this.render();
        toggleModal('mantra-list-modal');
    },

    visualFeedback() {
        const r = document.createElement('div');
        r.className = 'absolute inset-0 bg-orange-400/20 rounded-full animate-ping';
        document.getElementById('ripple-anchor').appendChild(r);
        setTimeout(() => r.remove(), 1000);
    },

    exportData() {
        const blob = new Blob([JSON.stringify(this.data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `divine_backup.json`; a.click();
    },

    exportOverallCSV() {
        const rows = [["Date", "Mantra Name", "Taps", "Rounds (108)", "Daily Goal", "Status (%)"]];
        const allEntries = [];
        this.data.mantras.forEach(m => {
            Object.keys(m.history).forEach(dateStr => {
                const count = m.history[dateStr];
                allEntries.push({
                    date: dateStr, name: m.name, taps: count, rounds: (count / 108).toFixed(1),
                    goal: m.goal, status: Math.round((count / m.goal) * 100) + "%"
                });
            });
        });
        allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        allEntries.forEach(e => rows.push([e.date, e.name, e.taps, e.rounds, e.goal, e.status]));
        const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `divine_overall_sadhana_report.csv`; a.click();
        this.showToast("Overall CSV Exported");
    },

    importData(e) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                this.data = JSON.parse(ev.target.result);
                this.save(); this.render();
                this.showToast("Data Restored");
            } catch(err) { this.showToast("Error"); }
        };
        reader.readAsText(e.target.files[0]);
    },

    renderStats() {
        const m = this.getActive();
        if (!m) return;
        const container = document.getElementById('chart-container');
        const labelsContainer = document.getElementById('chart-labels');
        const insight = document.getElementById('chart-insight');

        container.innerHTML = ''; labelsContainer.innerHTML = '';

        const counts = [];
        const days = [];
        let total7 = 0;

        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            days.push(d.toLocaleDateString(undefined, {weekday: 'narrow'}));
            const c = m.history[ds] || 0;
            counts.push(c); total7 += c;
        }

        const maxVal = Math.max(...counts, m.goal);
        counts.forEach((count, i) => {
            const height = (count / maxVal) * 100;
            const isGoal = count >= m.goal && count > 0;
            const bar = document.createElement('div');
            bar.className = `w-1/12 rounded-t-sm mx-0.5 chart-bar ${isGoal ? 'filled' : ''}`;
            bar.style.height = `${Math.max(height, 5)}%`;
            bar.title = `${count} Taps`;
            container.appendChild(bar);
            const lbl = document.createElement('div');
            lbl.className = 'w-1/12 text-center';
            lbl.innerText = days[i];
            labelsContainer.appendChild(lbl);
        });

        if (total7 === 0) insight.innerText = "Begin your journey today.";
        else if (counts[6] > m.goal) insight.innerText = "Excellent momentum!";
        else insight.innerText = "Consistency brings peace.";
    },

    render() {
        const m = this.getActive();
        if (!m) return;
        const isLight = this.data.theme === 'light';

        document.title = `(${m.session}) Divine Counter`;
        document.getElementById('display-name').innerText = m.name;
        document.getElementById('active-mantra-subtitle').innerText = m.name;

        document.getElementById('session-display').innerText = m.session;
        document.getElementById('rounds-count').innerText = Math.floor(m.session / 108);
        document.getElementById('lifetime-count').innerText = m.total;
        document.getElementById('lifetime-rounds-sub').innerText = Math.floor(m.total / 108) + " Rounds";

        const tk = new Date().toISOString().split('T')[0];
        const tc = m.history[tk] || 0;
        const cp = Math.min((tc / m.goal) * 100, 100);
        document.getElementById('goal-section').classList.remove('hidden');
        document.getElementById('goal-bar').style.width = cp + '%';

        const list = document.getElementById('mantra-list-container');
        list.innerHTML = this.data.mantras.map(x => {
            const active = x.id === this.data.activeId;
            const isD = this.pendingDeleteId === x.id;
            const isR = this.pendingResetId === x.id;
            const isRR = this.pendingResetRoundsId === x.id;
            const isE = this.pendingEditGoalId === x.id;
            const itemClass = active ?
                (isLight ? 'bg-slate-900 text-white shadow-lg border-transparent' : 'bg-orange-600 text-black shadow-xl border-transparent') :
                'bg-white/5 border-white/10 hover:border-white/20';

            const iconColor = active ? 'text-current opacity-80' : 'text-current opacity-50 hover:opacity-100';

            return `
                <div onclick="app.setActive('${x.id}')" class="mantra-card rounded-2xl border transition-all cursor-pointer ${itemClass}">
                    <div class="flex justify-between items-center gap-2">
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center mb-1">
                                ${active ? '<span class="active-indicator"></span>' : ''}
                                <h4 class="font-bold truncate">${x.name}</h4>
                            </div>
                            ${isE ? `
                                <div class="flex gap-2" onclick="event.stopPropagation()">
                                    <input type="number" id="edit-goal-${x.id}" value="${x.goal}" class="w-16 h-7 bg-black/10 rounded px-2 text-[10px] text-current">
                                    <button onclick="app.saveEditGoal('${x.id}', event)" class="text-[9px] font-black uppercase">Save</button>
                                </div>
                            ` : `<p class="uppercase tracking-widest opacity-60 truncate">${x.total} Total • Goal ${x.goal}</p>`}
                        </div>
                        <div class="flex items-center gap-1 ${iconColor} flex-shrink-0">
                            <button title="Edit Goal" onclick="app.startEditGoal('${x.id}', event)" class="${isE ? 'hidden' : ''}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            <button title="Reset Round (Daily)" onclick="app.resetRounds('${x.id}', event)" class="rounded-xl text-[9px] font-black uppercase transition-all ${isRR ? 'bg-white/20 px-2' : ''}">${isRR ? 'Round?' : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>'}</button>
                            <button title="Reset Total (Lifetime)" onclick="app.resetTotalOnly('${x.id}', event)" class="rounded-xl text-[9px] font-black uppercase transition-all ${isR ? 'bg-white/20 px-2' : ''}">${isR ? 'Total?' : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>'}</button>
                            <button title="Delete" onclick="app.deleteMantra('${x.id}', event)" class="rounded-xl text-[9px] font-black uppercase transition-all ${isD ? 'bg-white/20 px-2' : ''}">${isD ? 'Del?' : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const historyBox = document.getElementById('history-content');
        const dates = Object.keys(m.history).sort((a,b) => new Date(b) - new Date(a));
        if (dates.length === 0) {
            historyBox.innerHTML = `<div class="py-20 text-center opacity-30 text-sm italic serif">No records yet.</div>`;
        } else {
            historyBox.innerHTML = dates.map(d => {
                const count = m.history[d];
                const perc = Math.min(Math.round((count / m.goal) * 100), 100);
                return `<div class="mb-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div class="flex justify-between items-start mb-2">
                            <div><span class="block font-bold text-xs">${new Date(d).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span><span class="text-[9px] uppercase tracking-widest opacity-50">${(count/108).toFixed(1)} Rounds</span></div>
                            <div class="text-right"><span class="text-xl font-light gold-glow">${count}</span><span class="block text-[8px] opacity-50 font-black tracking-widest">${perc}% Goal</span></div>
                        </div>
                        <div class="w-full h-1 bg-black/10 rounded-full overflow-hidden"><div class="h-full bg-current opacity-80 transition-all duration-1000" style="width: ${perc}%; background-color: var(--accent);"></div></div>
                    </div>`;
            }).join('');
        }
    }
};

function toggleModal(id) {
    const el = document.getElementById(id);
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        if (id === 'stats-modal') app.renderStats();
        app.render();
    } else {
        el.classList.add('hidden');
        app.pendingEditGoalId = null; app.pendingResetRoundsId = null; app.pendingResetId = null; app.pendingDeleteId = null;
    }
}
window.onload = () => app.init();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, toggleModal };
}

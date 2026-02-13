from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to the app
        print("Navigating to app...")
        page.goto("http://localhost:4173/")

        # Wait for the app to load
        page.wait_for_selector(".app-container")
        print("App loaded.")

        # Take screenshot of main screen
        page.screenshot(path="/home/jules/verification/main_screen.png")
        print("Main screen screenshot taken.")

        # 2. Click on "Manage Mantras" button
        # The button has a title "Manage Mantras"
        print("Opening Manage Mantras modal...")
        page.click('button[title="Manage Mantras"]')

        # Wait for modal to appear
        page.wait_for_selector("#mantra-list-modal:not(.hidden)")
        print("Modal opened.")

        # Wait for Google Drive section to be visible
        page.wait_for_selector("#gdrive-status")
        print("Google Drive section visible.")

        # Take screenshot of the modal with Google Drive Sync UI
        page.screenshot(path="/home/jules/verification/gdrive_ui.png")
        print("Modal screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_frontend()

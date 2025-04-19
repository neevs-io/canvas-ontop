# Chrome Web Store Listing Information

## Basic Information

**Extension Name:** Canvas On Top

**Summary:** AI-powered Canvas LMS assistant for better task management and priority insights

**Description:**
Canvas On Top is an AI-powered Chrome extension that enhances your Canvas LMS experience by providing smart organization and time management features:

- 📋 **Assignment Organizer:** View all your tasks across courses in a single side panel
- 🔍 **Priority Calendar:** AI-powered algorithm highlights your most important tasks
- 🤖 **Smart Insights:** Get personalized study recommendations based on your schedule
- ⏰ **Deadline Management:** Never miss an assignment with real-time notification badges

Perfect for busy students juggling multiple courses, Canvas On Top transforms the Canvas experience with a sleek, draggable floating button that gives you instant access to your academic priorities.

The extension works completely client-side, with all data stored locally. Your Canvas credentials are never shared, and OpenAI integration is optional.

## Category
Education

## Language
English

## Images

### Screenshots (1280x800 or 640x400)
1. Main Dashboard View - Shows the side panel with organized assignments
2. Priority Calendar View - Displays the calendar with priority indicators
3. Settings Screen - Shows configuration options

## Additional Information

**Version:** 1.0.0

**Website:** https://github.com/neevs-io/canvas-ontop

## Privacy & Permissions

**Privacy Policy URL:** https://github.com/neevs-io/canvas-ontop/blob/main/privacy-policy.md

**Permissions Justification:**
- **tabs, activeTab, sidePanel:** Required to display the side panel UI and interact with Canvas pages
- **storage:** Stores user preferences and caches Canvas data locally
- **host_permissions (instructure.com/api/v1/courses/*):** Limited scope to access only course-related Canvas API data
- **host_permissions (openai.com/v1/chat/completions):** Optional AI integration, only used when user provides their own API key

## Distribution

**Visibility Options:** Public (Listed in Chrome Web Store)

**Distribution Countries:** All regions

## Packaging Checklist

✅ manifest.json includes all required fields
✅ Icons included (16x16, 32x32, 48x48, 128x128)
✅ Screenshots prepared
✅ Privacy policy created
✅ All permissions properly justified
✅ Code packaged in dist/ folder

## Submission Notes

When submitting to the Chrome Web Store:
1. Create a ZIP file of the `dist` folder contents (not the folder itself)
2. Upload the ZIP file to the Chrome Developer Dashboard
3. Fill in the listing information from this document
4. Complete the Privacy practices questionnaire

## Store Publishing Information

### Single Purpose Description
Canvas On Top is designed for a single purpose: to enhance the Canvas LMS experience by providing students with streamlined task management and prioritization capabilities directly within their existing Canvas workflow, helping them better organize their academic responsibilities.

### Permission Justifications

#### tabs justification
The tabs permission is necessary to detect when a user is on a Canvas LMS page and to enable the extension to open specific Canvas pages when a user interacts with assignments or courses from the extension's interface.

#### sidePanel justification
The sidePanel permission is essential for our core functionality - it creates a dedicated space where users can view all their Canvas assignments across courses in an organized manner without leaving their current Canvas page.

#### storage justification
The storage permission is required to save user preferences, cache Canvas API data locally for offline access, and store prioritization settings to provide a consistent experience between browser sessions.

#### activeTab justification
The activeTab permission is needed to interact with the current Canvas page, allowing the extension to identify the current course context and provide relevant information in the side panel.

#### Host permission justification
Host permission for instructure.com is limited to only "/api/v1/courses/*" which is the minimum scope needed to access assignments, discussions, and course data through the Canvas LMS API. This precise permission scope ensures we only request access to the specific API endpoints required for the extension's core functionality.

The OpenAI API endpoint permission (api.openai.com/v1/chat/completions) is strictly limited to a single endpoint and is only used when users explicitly enable AI features by providing their own API key. No user data is transferred to OpenAI without explicit user consent through providing their own API key. All API communication is done client-side with no intermediate server processing or data retention.

### Remote Code Usage
No, I am not using Remote code. All JavaScript is packaged within the extension. The only external API calls are to the Canvas LMS API (to retrieve user's course data) and optionally to the OpenAI API (if users enable AI features and provide their own API key).
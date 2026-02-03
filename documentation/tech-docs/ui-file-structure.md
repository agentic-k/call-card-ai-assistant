Below is a concise design explanation for migrating your components along with step-by-step cursor instructions to help guide you through the process.

---

### Design Overview

- **Global vs. Page-Specific:**  
  Components that are reused across multiple pages remain in the global `@/components` folder. Page-specific components should be moved to a `components/` subfolder within the corresponding page or feature directory.

- **Example Structure:**  
  ```
  my-project/
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx
  │   └── dashboard/
  │       ├── layout.tsx
  │       ├── page.tsx          // Main dashboard page
  │       └── components/       // Dashboard-specific components
  │           ├── DashboardHeader.tsx
  │           └── DashboardStats.tsx
  ├── components/               // Global reusable components
  │   ├── ui/
  │   │   ├── Button.tsx
  │   │   └── Input.tsx
  │   └── custom/
  │       ├── Navbar.tsx
  │       └── Footer.tsx
  ├── lib/
  ├── styles/
  ├── types/
  └── public/
  ```

- **Benefits:**  
  - **Modularity:** Keeps page-specific components isolated.
  - **Maintainability:** Easier to manage imports and modifications.
  - **Scalability:** Supports growing projects with clear boundaries.

---

### Cursor Instructions

1. **Open Your Code Editor:**  
   Launch your favorite code editor (e.g., VS Code).

2. **Navigate to the Global Components Folder:**  
   Use the file explorer to open the `@/components` directory.

3. **Identify a Page-Specific Component:**  
   Determine which component(s) belong only to a specific page (e.g., `DashboardHeader.tsx` for the dashboard).

4. **Create a New Components Folder:**  
   In the file explorer, navigate to the relevant page directory (e.g., `app/dashboard/`) and create a new folder named `components`.

5. **Move the Component:**  
   Drag and drop the identified component file (e.g., `DashboardHeader.tsx`) from `@/components` to the new `app/dashboard/components/` folder.

6. **Update Import Paths:**  
   Open any files that import the moved component and update the import path to reflect its new location.  
   For example, change:
   ```tsx
   import DashboardHeader from '@/components/DashboardHeader';
   ```
   to:
   ```tsx
   import DashboardHeader from './components/DashboardHeader';
   ```

7. **Test Your Changes:**  
   Run your application to ensure that the moved component is correctly imported and functioning as expected.

8. **Repeat for Other Components:**  
   Follow steps 3–7 for each page-specific component that needs to be migrated.

---

These instructions should help you systematically migrate your components to a more modular, page-specific structure while maintaining project clarity and scalability.


prompt use to migrate
```
refactor such that it is concise and uses components to render data for ese of understanidng, testing and development 

do the folloiwing


we’re migrating components from the global @/components folder to more organized, folder-specific locations.

What You Need to Do:

Identify Page-Specific Components:
Review your existing components in @/components and identify those used only within specific pages or features.

Create Folder-Specific Directories:
For each page or feature, create a dedicated components/ folder. For example, if you have a dashboard page, structure it as follows:

markdown
Copy
app/
└── dashboard/
    ├── page.tsx
    └── components/
        ├── dashboard-header.tsx
        └── dashboard-stats.tsx
Move the Components:
Migrate the identified components from the global @/components folder into the appropriate folder-specific directories.

Update Import Paths:
After moving the components, update your import statements in your page files and other components to reflect the new paths.
For example, update: @MeetingHistoryPage.tsx 

for file name use -  example "dashboard-header"

tsx
Copy
import DashboardHeader from '@/components/dashboard-header';
to:

tsx
Copy
import DashboardHeader from './components/dashboard-header';
```
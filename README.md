# Shree Yuwa Shakti Club

Youth club website + admin panel built with React (Create React App).
All data is stored in the browser (`localStorage`) – no backend needed.

## Run
```bash
npm install
npm start        # http://localhost:3000
npm run build    # production build
```

## Demo logins
| Role  | Email          | Password |
|-------|----------------|----------|
| Admin | a@gmail.com    | 123456   |
| User  | sita@gmail.com | 123456   |
| User  | anil@gmail.com | 123456   |

Admin login opens the admin dashboard only. Seeded members (Sita, Anil) auto-reply in DMs
so notifications can be tried – set `DEMO_REPLIES = false` in `src/utils.js` for production.

## Structure
- `src/components/common`  shared UI (Modal, Avatar, Photo, Icon, Toast, Loader, Thumbs)
- `src/components/auth`    login / signup form
- `src/components/public`  public site pages and parts
- `src/components/chat`    chat list, window, bubbles
- `src/components/admin`   admin dashboard and CRUD tabs
- `src/context`            Theme, App (data) and Auth contexts
- `src/hooks`              useLS, useScrollHide, useToast
- `src/data`               seed data and icon paths
- `src/pages`              PublicApp and AdminApp

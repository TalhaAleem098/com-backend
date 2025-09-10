# Module Alias Setup for Node.js Project

This document provides a **complete setup** for using module aliases in your Node.js project.

---

## 1. Install `module-alias`

Install the package using npm:

```bash
npm install module-alias
```

---

## 2. Configure aliases in `package.json`

Add the `_moduleAliases` section at the **root level** of `package.json` (same level as `dependencies`):

```json
"_moduleAliases": {
  "@": ".",
  "@models": "models",
  "@controllers": "controllers",
  "@utils": "utils",
  "@routes": "routes"
}
```

> **Note:**
>
> * `@` points to the root folder.
> * Other aliases point to specific folders.
> * You can add more aliases as needed.

---

## 3. Register module-alias in your app

At the **very top** of your main file (`server.js` or `app.js`), add:

```js
require('module-alias/register');
```

> **Important:** This should be before any other `require` statements that use aliases.

---

## 4. Use aliases in require statements

Now you can import modules using your aliases instead of relative paths:

```js
const User = require('@models/User');
const AuthController = require('@controllers/AuthController');
const helper = require('@utils/helper');
const router = require('@routes/admin');
```

> This works anywhere in your project.

---

## 5. Tips

* Make sure folder names in `_moduleAliases` match your actual folder names.
* You can add aliases for **any folder**, e.g., services, configs, middlewares.
* After setup, you can move files around without changing long relative paths.

✅ Your Node.js project is now ready to use clean, alias-based imports.

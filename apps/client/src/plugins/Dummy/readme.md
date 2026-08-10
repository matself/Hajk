## The Dummy-plugin

To make it easier for developers to create new plugins in Hajk we've decided to provide a Dummy-plugin. The Dummy-plugin contains information and examples regarding plugin development. If you find that something that is regularly used is missing, feel free to add it!

### Creating a new plugin

When creating a new plugin, there are some crucial steps to get going:

- Make a copy of the plugin-template (The plugin template is still TODO, so copy the Dummy for now)
- Set proper names on files and components
- **Make sure to add the new plugin to `AVAILABLE_TOOLS` (in `apps/client/src/constants.js`) as well as to `availableTools` in `appConfig.json`.**
- Make sure to add some kind of basic configuration for your plugin to the tool in the your map configuration file.

### Anatomy of a plugin

A typical plugin folder looks like this:

```
MyPlugin/
├── MyPlugin.jsx          # Entry component — wires model/view into BaseWindowPlugin
├── MyPluginModel.js       # Plugin logic (non-React): map access, local storage, event handlers
├── MyPluginView.jsx       # Actual UI rendered inside the plugin window
├── constants/index.js     # Static config/constants for the plugin
└── readme.md              # Plugin dev notes (optional, but nice to have)
```

Only create the files you actually need — not every plugin requires a Model, and some simpler plugins may not need a separate constants file.

#### The entry component (`MyPlugin.jsx`)

- Imports `BaseWindowPlugin` (or `DialogWindowPlugin` for simpler dialog-style plugins), which abstracts window chrome, Drawer/Widget buttons, and show/hide state.
- Creates a `localObserver` (via `react-event-observer`, held in `useState` so it isn't recreated on every render) for communication within the plugin.
- Instantiates the plugin's Model (and any shared core models, e.g. `DrawModel`) once via a lazy `useState(() => new Model(...))`.
- Manages plugin-level state (title, color, visibility, active tool mode) and effects tied to that state (e.g. toggling a draw interaction on/off with window visibility).
- Renders `BaseWindowPlugin` with a `type` prop that must exactly match the plugin's directory name (valid JS identifier, upper-case first letter), passing a `custom` object (icon, title, color, description, dimensions, window handlers) and the plugin's View as a child.

#### The model (`MyPluginModel.js`)

- A plain class, no React. Holds private fields (e.g. `#map`, `#app`, `#localObserver`) set from the constructor's `settings` object.
- Subscribes to `localObserver` events in an `#initSubscriptions()` method.
- Exposes public methods the View calls (e.g. `getMap()`), and can use `LocalStorageHelper` for map-scoped persistence.

#### The view (`MyPluginView.jsx`)

- A functional component using hooks (`useState`, `useEffect`, `useCallback`).
- Uses MUI components, styled via the `styled()` utility or the `sx` prop.
- Can register a Drawer button via `globalObserver.publish("core.addDrawerToggleButton", {...})`.
- Can use `useSnackbar()` for notifications and `useCookieStatus()` to check whether it's allowed to write to local storage.
- Talks to the Model directly (`props.model.someMethod()`) and to the parent entry component via `localObserver.publish(...)` or a callback passed down as a prop (e.g. `updateCustomProp`).

#### Constants (`constants/index.js`)

Just frozen constant objects/values kept out of the component files for clarity (e.g. default draw/measurement settings).

### Registering the plugin

Creating the files isn't enough — a plugin also needs to be registered:

1. Add the plugin name to `AVAILABLE_TOOLS` in `apps/client/src/constants.js` — case-sensitive, must match the directory name exactly.
2. Add it to `availableTools` in `apps/client/public/appConfig.json`.
3. Add a basic config entry (tool name in lower-case) for it in the relevant map configuration JSON (backend `App_Data`).
4. `AppModel.loadPlugins()` (via `pluginManager.loadPlugins()`) dynamically imports `plugins/<Name>/<Name>.jsx` (or `.tsx`) for each active tool name — this is what actually loads the plugin at runtime.

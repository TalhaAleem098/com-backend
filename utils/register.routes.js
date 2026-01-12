const routes = [];
const { v4: uuidv4 } = require('uuid');

function registerRoute(method, path) {
    const id = uuidv4();
    const route = {
        id,
        method: method.toUpperCase(),
        path,
        url: path // Assuming path is the full URL path, e.g., '/api/users'
    };
    routes.push(route);
}

function getRegisteredRoutes() {
    return routes;
}

module.exports = {
    registerRoute,
    getRegisteredRoutes
};
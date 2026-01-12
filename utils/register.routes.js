const routes = [];
const { randomUUID } = require('crypto');

function registerRoute(method, path) {
    const id = randomUUID();
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
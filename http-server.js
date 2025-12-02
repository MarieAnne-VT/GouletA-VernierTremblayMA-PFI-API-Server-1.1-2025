/////////////////////////////////////////////////////////////////////
// This module is the starting point of the http server
/////////////////////////////////////////////////////////////////////
import APIServer from "./api-server.js";

import RouteRegister from './router.js';
RouteRegister.add('GET', 'Bookmarks', 'list');
RouteRegister.add('POST', 'Accounts', 'register');
RouteRegister.add('GET', 'Accounts', 'verify');
RouteRegister.add('GET', 'Accounts', 'logout');
RouteRegister.add('PUT', 'Accounts', 'modify');
RouteRegister.add('GET', 'Accounts', 'remove');
RouteRegister.add('GET', 'Accounts', 'conflict');
RouteRegister.add('POST', 'Accounts', 'block');
RouteRegister.add('POST', 'Accounts', 'promote');

let server = new APIServer();
server.start();


'use strict';
const got = require('got');
const OdooClient = require('./client');

class Odoo {

	constructor(config) {
		config = config || {};

		if (typeof config.host !== 'string') {
			throw new TypeError(`Expected \`host\` to be a \`string\`, got \`${typeof config.host}\``);
		}

		this._config = Object.assign({
			port: 80
		}, config);
	}

	connect(opts) {
		const config = Object.assign({}, this._config, opts);

		const params = {
			db: config.database,
			login: config.username,
			password: config.password
		};

		// Throw them away
		delete config.database;
		delete config.username;
		delete config.password;

		const body = JSON.stringify({params});

		const headers = {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		};

		const createError = err => {
			const error = new Error(err.message);
			error.code = err.code;
			error.data = err.data;
			return error;
		};

		const protocol = config.protocol === 'https' ? 'https://' : '';

		const odooInstance = () => got.post(`${protocol}${config.host}:${config.port}/web/session/authenticate`, {json: true, headers, body})
			.then(res => {
				const headersRes = res.headers['set-cookie'];
				const sessionIdCookie = headersRes.find(elm => elm.includes("session_id"))
				const sessionId = sessionIdCookie.split(';')[0]
				console.log("created odooInstance...")
				console.log("sessionId", sessionId)

				if (res.body.error) {
					// HTTP Status is 200 / OK!
					throw createError(res.body.error);
				}

				return new OdooClient(res.body.result, {
					protocol: config.protocol,
					host: config.host,
					port: config.port,
					sid: sessionId
				});
			}).catch(error => {
				if(error.message.includes('expired')) {
					console.log("Odoo is expired")
					return odooInstance()
				}

				throw error
			});

			return odooInstance()
	}
}

module.exports = Odoo;

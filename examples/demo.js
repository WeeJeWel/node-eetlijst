'use strict';

const Eetlijst = require('..');

let username = process.argv[2];
let password = process.argv[3];

let eetlijst = new Eetlijst( username, password );
	/*
	eetlijst
		.getSummary()
		.then( summary => {
			console.log('summary', JSON.stringify(summary, false, 4));
		})
		.catch( err => {
			console.error('err', err);
		})
	*/


	eetlijst
		.setUserState('Bas', 'eat')
		.then( success => {
			console.log('success', success);
		})
		.catch( err => {
			console.error('err', err);
		})
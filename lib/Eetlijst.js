'use strict';

const querystring 	= require('querystring');

const axios 		= require('axios');
const cheerio 		= require('cheerio')

const baseUrl = 'http://eetlijst.nl';
const imgStateMap = {
	'leeg.gif'	: 'unknown',
	'nop.gif'	: 'absent',
	'eet.gif'	: 'eat',
	'kook.gif'	: 'cook'
}

const stateSetMap = {
	'unknown'	: -5,
	'eat'		: -1,
	'absent'	: 0,
	'cook'		: 1
}

class Eetlijst {

	constructor( username, password ) {

		this._username = username;
		this._password = password;

		this._sessionId = undefined;

	}

	login() {

		let body = querystring.stringify({
			login	: this._username,
			pass	: this._password
		});

		return axios({
			method: 'post',
				url: `${baseUrl}/login.php`,
				maxRedirects: 0,
				data: body,
				validateStatus: function(status){
					return status >= 200 && status < 400;
				}
			})
			.then( response => {
				if( response.headers['location'] && response.headers['location'].indexOf('main.php') === 0 ) {
					this._sessionId = response.headers['location'].replace('main.php?session_id=', '');
				} else {
					throw new Error('invalid username or password');
				}
			})


	}

	setUserState( userName, state, dayId ) {

		return this
			.getSummary()
			.then(( summary ) => {

				let userId = summary.users.indexOf( userName );
				if( userId === -1 )
					throw new Error('invalid user');

				let what = stateSetMap[ state ];
				if( typeof what === 'undefined' )
					throw new Error('invalid state');

				let day = dayId;
				if( typeof day === 'undefined' )
					day = summary.days[0].id;

				let body = querystring.stringify({
					'session_id'		: this._sessionId,
					'day[]'				: day,
					'submittype'		: 0,
					'what'				: what,
					'who'				: userId,
					'submitwithform.x'	: 27,
					'submitwithform.y'	: 12
				});

				return axios({
					method: 'post',
					url: `${baseUrl}/main.php`,
					data: body
				})
					.then( response => {
						return true;
					})

			});

	}

	getSummary() {

		return this
			.login()
			.then(() => {

				return new Promise((resolve, reject) => {

					if( !this._sessionId )
						throw new Error('missing session');

					return resolve( axios.get(`${baseUrl}/main.php?session_id=${this._sessionId}`)
						.then( response => {

							if( !response.data )
								throw new Error('invalid response');

							let $ = cheerio.load( response.data );

							if( $('title').text().indexOf('Inloggen') > -1 )
								throw new Error('unauthorized');

							// get users
							let resultObj = {};
								resultObj.users = [];
								resultObj.days = [];

							$('body th[width="80"]:not([height])').each(function(){
								let userName = $(this).text();
								resultObj.users.push( userName );
							})

							// get days
							$('body tr.s')
								.parent()
								.children('tr')
								.each(function(){
									let date = $(this).find('td').first().text();
										date = date.trim();
									if( date.length < 1 ) return;

									let deadline = $(this).find('td').eq(1).text();
										deadline = deadline.trim();

									let id = $(this).find('td:nth-child(2) a').attr('href');
									if( typeof id === 'undefined' ) return;
										id = id.replace('javascript:vs(', '');
										id = id.replace(');', '');

									let dayObj = {};
										dayObj.id = id;
										dayObj.date = date;
										dayObj.deadline = deadline;
										dayObj.users = {};
										dayObj.totals = {
											'unknown'	: 0,
											'absent'	: 0,
											'eat'		: 0,
											'cook'		: 0
										};

									$(this).find('td').each(function( index ){
										let img = $(this).find('img');
										if( img.length < 1 ) return;

										let user = resultObj.users[ index - 2 ];
										let state = imgStateMap[ $(img).attr('src') ];

										dayObj.totals[ state ]++;

										dayObj.users[ user ] = state;
									});

									resultObj.days.push( dayObj );

								})

							return resultObj;

						}));

				});

		});

	}

}

module.exports = Eetlijst;
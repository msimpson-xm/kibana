/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import fs from 'fs';
// import expect from '@kbn/expect';
import http from 'http';
// import https from 'https';
// import { promisify } from 'util';
// import { fromNullable, map, filter, getOrElse } from 'fp-ts/lib/Option';
// import { pipe } from 'fp-ts/lib/pipeable';
// import { constant } from 'fp-ts/lib/function';
// import { KBN_KEY_PATH, KBN_CERT_PATH } from '@kbn/dev-utils';

export async function initPlugin() {
  return http.createServer((request, response) => {
    if (request.method === 'POST') {
      let data = '';
      request.on('data', (chunk) => {
        data += chunk;
      });
      request.on('end', () => {
        switch (data) {
          case 'success':
            response.statusCode = 200;
            response.end('OK');
            return;
          case 'respond-with-40x':
            response.statusCode = 400;
            response.end('Error');
            return;
          case 'respond-with-429':
            response.statusCode = 429;
            response.end('Error');
            return;
          case 'respond-with-502':
            response.statusCode = 502;
            response.end('Error');
            return;
        }
      });
    } else {
      response.writeHead(400, { 'Content-Type': 'text/plain' });
      response.end('Error');
      return;
    }
  });
}

// export async function initPlugin() {
//   const httpsServerKey = await promisify(fs.readFile)(KBN_KEY_PATH, 'utf8');
//   const httpsServerCert = await promisify(fs.readFile)(KBN_CERT_PATH, 'utf8');

//   return {
//     httpServer: http.createServer(createServerCallback()),
//     httpsServer: https.createServer(
//       {
//         key: httpsServerKey,
//         cert: httpsServerCert,
//       },
//       createServerCallback()
//     ),
//   };
// }

// function createServerCallback() {
//   const payloads: string[] = [];
//   return (request: http.IncomingMessage, response: http.ServerResponse) => {
//     const credentials = pipe(
//       fromNullable(request.headers.authorization),
//       map((authorization) => authorization.split(/\s+/)),
//       filter((parts) => parts.length > 1),
//       map((parts) => Buffer.from(parts[1], 'base64').toString()),
//       filter((credentialsPart) => credentialsPart.indexOf(':') !== -1),
//       map((credentialsPart) => {
//         const [username, password] = credentialsPart.split(':');
//         return { username, password };
//       }),
//       getOrElse(constant({ username: '', password: '' }))
//     );

//     let data = '';
//     request.on('data', (chunk) => {
//       data += chunk;
//     });
//     request.on('end', () => {
//       switch (data) {
//         case 'success':
//           response.statusCode = 200;
//           response.end('OK');
//           return;
//         case 'authenticate':
//           return validateAuthentication(credentials, response);
//         case 'respond-with-40x':
//           response.statusCode = 400;
//           response.end('Error');
//           return;
//         case 'respond-with-429':
//           response.statusCode = 429;
//           response.end('Error');
//           return;
//         case 'respond-with-502':
//           response.statusCode = 502;
//           response.end('Error');
//           return;
//       }

//       // store a payload that was posted to be remembered
//       const match = data.match(/^payload (.*)$/);
//       if (match) {
//         payloads.push(match[1]);
//         response.statusCode = 200;
//         response.end('ok');
//         return;
//       }

//       response.statusCode = 400;
//       response.end(`unexpected parameters ${data}`);
//       return;
//     });
//   };
// }

// function validateAuthentication(credentials: any, res: any) {
//   try {
//     expect(credentials).to.eql({
//       user: 'username',
//       password: 'mypassphrase',
//     });
//     res.statusCode = 200;
//     res.end('OK');
//   } catch (ex) {
//     res.statusCode = 403;
//     res.end(`the validateAuthentication operation failed. ${ex.message}`);
//   }
// }

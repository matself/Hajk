import { hashPassword } from "../apis/v2/utils/adminPassword.js";

const password = process.argv[2];

if (!password) {
  throw new Error('Usage: npm run hash-admin-password -- "yourPassword"');
}

console.log(hashPassword(password));

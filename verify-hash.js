const bcrypt = require('bcryptjs')
const hash = '$2a$10$Hnz.9gfV6h2iyTcvnKMaEes/InrXTMDGoofANJeqAtDhqkn1iwe.e'
bcrypt.compare('TestPass123', hash).then(r => console.log('match:', r))

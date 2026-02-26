const fs = require('fs');

// We have mock.html and mock.css. I will just calculate the Y positions using a simple loop.
// Since it's CSS, there's no actual layout engine in Node.
// But we can just inject a small script into mock.js that records the offsetTops and logs them to console
// or I can just write them down in the CSS.

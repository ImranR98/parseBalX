require('dotenv').config()
const express = require('express')
const path = require('path')
const fs = require('fs')
const lib = require('./lib')

const balanceXLSX = process.env['BALANCE_PATH'] || path.resolve(`${__dirname}/../Balance.xlsx`)
const PORT = 3000

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (!balanceXLSX || !fs.existsSync(balanceXLSX)) {
    throw 'BALANCE_PATH environment variable not defined!'
}

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/metadata', async (req, res) => {
    try {
        const txns = await lib.parseBalanceXLSX(balanceXLSX)
        res.send(lib.getTransactionMetadata(txns))
    } catch (e) {
        console.error(e)
        res.status(500).send()
    }
})

app.post('/generateReport', async (req, res) => {
    try {
        const txns = await lib.parseBalanceXLSX(balanceXLSX)
        res.send(lib.generateTransactionsReport(txns, req.body.categories, req.body.currencies))
    } catch (e) {
        console.error(e)
        res.status(500).send()
    }
})

app.all('*', (req, res) => {
    res.redirect('/')
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

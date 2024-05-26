const xlsx = require('xlsx')
const ExcelJS = require('exceljs')

module.exports.parseBalanceXLSX = async (filePath) => {
    function excelDateToJSDate(serial) {
        const excelEpoch = new Date(Date.UTC(1900, 0, 1)) // Excel epoch starts on 1900-01-01
        const msPerDay = 86400000 // Number of milliseconds per day
        const serialDate = serial - 1 // Adjust for Excel leap year bug
        const date = new Date(excelEpoch.getTime() + serialDate * msPerDay)
        return date
    }

    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath);
    const transactions = [];

    for await (const worksheet of workbook) {
        for await (const row of worksheet) {
            if (worksheet.name !== 'Transactions') continue
            if (row.number === 1) continue
            if (row.values.length == 0) continue
            const [dateStr, description, moneyIn, moneyOut, currency, type] = row.values.slice(1)
            const date = new Date(excelDateToJSDate(dateStr))
            if (isNaN(date)) {
                throw 'INVALID: ' + row.values
            }
            transactions.push({
                date,
                description: description,
                amount: (moneyIn || 0) - (moneyOut || 0),
                currency: currency,
                category: type
            })
        }
    }

    return transactions
}

module.exports.getTransactionMetadata = (transactions) => {
    const categories = new Set()
    const currencies = new Set()
    transactions.forEach(txn => {
        if (txn.category) categories.add(txn.category)
        if (txn.currency) currencies.add(txn.currency)
    })
    return {
        categories: Array.from(categories),
        currencies: Array.from(currencies)
    }
}

module.exports.filterTransactions = (transactions, startDate, endDate, categories, currencies) => {
    return transactions.filter(txn => {
        const satisfiesDateConstraints = txn.date >= new Date(startDate) && txn.date <= new Date(endDate)
        const satisfiesCategoryConstraints = categories.includes(txn.category)
        const satisfiesCurrencyConstraints = currencies.includes(txn.currency)
        return satisfiesDateConstraints && satisfiesCategoryConstraints && satisfiesCurrencyConstraints
    })
}

module.exports.getMonthlyDateRanges = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dateRanges = []

    let currentStart = new Date(start.getFullYear(), start.getMonth(), 1)
    while (currentStart <= end) {
        const currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0)
        dateRanges.push({
            start: new Date(currentStart),
            end: new Date(Math.min(currentEnd.getTime(), end.getTime()))
        })
        currentStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1)
    }

    return dateRanges
}

module.exports.summarizeTransactions = (transactions) => {
    let report = {}
    transactions.forEach(txn => {
        if (!report[txn.currency]) {
            report[txn.currency] = {
                expenses: 0,
                earnings: 0
            }
        }
        if (txn.amount < 0) {
            report[txn.currency].expenses += (txn.amount * -1)
        } else {
            report[txn.currency].earnings += txn.amount
        }
    })
    return report
}

module.exports.generateTransactionsReport = (transactions, categoryFilter, currencyFilter) => {
    const months = this.getMonthlyDateRanges(transactions[0].date, transactions[transactions.length - 1].date)
    return months.map(month => {
        const monthsTxns = this.filterTransactions(transactions, month.start, month.end, categoryFilter, currencyFilter)
        return { month: month.start, summary: this.summarizeTransactions(monthsTxns) }
    })
}
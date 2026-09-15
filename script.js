const investmentForm = document.getElementById("investment-form");
const symbolInput = document.getElementById("symbol");
const quantityInput = document.getElementById("quantity");

const formMessage = document.getElementById("form-message");
const saveMessage = document.getElementById("save-message");

const portfolioBody = document.getElementById("portfolio-body");
const totalValue = document.getElementById("total-value");

const saveCsvButton = document.getElementById("save-csv");
const saveTxtButton = document.getElementById("save-txt");
const clearButton = document.getElementById("clear-portfolio");


function showMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle("error", isError);
}


async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.error || `Request failed with status ${response.status}`
        );
    }

    return data;
}


function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);
}


function renderPortfolio(data) {
    portfolioBody.innerHTML = "";

    for (const item of data.items) {
        const row = document.createElement("tr");

        const symbolCell = document.createElement("td");
        symbolCell.textContent = item.symbol;

        const priceCell = document.createElement("td");
        priceCell.textContent = formatMoney(item.price);

        const quantityCell = document.createElement("td");
        quantityCell.textContent = item.quantity;

        const totalCell = document.createElement("td");
        totalCell.textContent = formatMoney(item.total);

        row.appendChild(symbolCell);
        row.appendChild(priceCell);
        row.appendChild(quantityCell);
        row.appendChild(totalCell);

        portfolioBody.appendChild(row);
    }

    totalValue.textContent = formatMoney(data.total_value);

    const hasItems = data.items.length > 0;

    saveCsvButton.disabled = !hasItems;
    saveTxtButton.disabled = !hasItems;
    clearButton.disabled = !hasItems;
}


async function loadPrices() {
    const prices = await api("/api/prices", {
        method: "GET"
    });

    const priceList = document.getElementById("price-list");
    const stockList = document.getElementById("stock-list");

    priceList.innerHTML = "";
    stockList.innerHTML = "";

    const sortedPrices = Object.entries(prices).sort(
        ([symbolA], [symbolB]) => symbolA.localeCompare(symbolB)
    );

    for (const [symbol, price] of sortedPrices) {
        const listItem = document.createElement("li");
        listItem.textContent = `${symbol}: ${formatMoney(price)}`;
        priceList.appendChild(listItem);

        const option = document.createElement("option");
        option.value = symbol;
        stockList.appendChild(option);
    }
}


async function loadPortfolio() {
    const data = await api("/api/investments", {
        method: "GET"
    });

    renderPortfolio(data);
}


investmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        symbol: symbolInput.value.trim().toUpperCase(),
        quantity: quantityInput.value
    };

    try {
        const data = await api("/api/investments", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        showMessage(
            formMessage,
            `Added ${data.item.symbol}. Current total: ${formatMoney(data.total_value)}`
        );

        renderPortfolio(data);

        investmentForm.reset();
        symbolInput.focus();

    } catch (error) {
        showMessage(formMessage, error.message, true);
    }
});


async function savePortfolio(format) {
    try {
        const data = await api("/api/save", {
            method: "POST",
            body: JSON.stringify({
                format: format
            })
        });

        showMessage(saveMessage, data.message);

    } catch (error) {
        showMessage(saveMessage, error.message, true);
    }
}


saveCsvButton.addEventListener("click", function () {
    savePortfolio("csv");
});


saveTxtButton.addEventListener("click", function () {
    savePortfolio("txt");
});


clearButton.addEventListener("click", async function () {
    const confirmed = confirm("Clear all portfolio items?");

    if (!confirmed) {
        return;
    }

    try {
        const data = await api("/api/investments", {
            method: "DELETE"
        });

        renderPortfolio(data);
        showMessage(saveMessage, "Portfolio cleared.");

    } catch (error) {
        showMessage(saveMessage, error.message, true);
    }
});


document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadPrices();
        await loadPortfolio();

    } catch (error) {
        showMessage(saveMessage, error.message, true);
    }
});
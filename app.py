from flask import Flask, render_template, request, jsonify
from datetime import datetime
import csv
import math


app = Flask(__name__)


# Hardcoded stock prices dictionary
STOCK_PRICES = {
    "AAPL": 180.00,
    "TSLA": 250.00,
    "GOOGL": 140.00,
    "MSFT": 420.00,
    "AMZN": 185.00
}


# This stores portfolio items while the server is running
portfolio = []


def get_portfolio_summary():
    """
    Returns portfolio items and total investment value.
    """
    total_value = sum(item["total"] for item in portfolio)

    return {
        "items": portfolio,
        "total_value": round(total_value, 2)
    }


@app.route("/")
def index():
    """
    Serves the frontend HTML page.
    """
    return render_template("index.html")


@app.get("/api/prices")
def get_prices():
    """
    Returns available stock prices to the frontend.
    """
    return jsonify(STOCK_PRICES)


@app.get("/api/investments")
def get_investments():
    """
    Returns current portfolio and total investment.
    """
    return jsonify(get_portfolio_summary())


@app.post("/api/investments")
def add_investment():
    """
    Receives stock symbol and quantity from frontend.
    Calculates total investment and adds it to portfolio.
    """
    data = request.get_json(silent=True) or {}

    symbol = str(data.get("symbol", "")).strip().upper()
    quantity_raw = data.get("quantity")

    # Validate symbol
    if not symbol:
        return jsonify({
            "error": "Stock symbol is required."
        }), 400

    # Validate quantity
    try:
        quantity = float(quantity_raw)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Quantity must be a valid number."
        }), 400

    if not math.isfinite(quantity) or quantity <= 0:
        return jsonify({
            "error": "Quantity must be greater than zero."
        }), 400

    # Check if stock exists in hardcoded dictionary
    if symbol not in STOCK_PRICES:
        available_symbols = ", ".join(STOCK_PRICES.keys())

        return jsonify({
            "error": f"'{symbol}' is not available. Available symbols: {available_symbols}"
        }), 404

    # Basic arithmetic calculation
    price = STOCK_PRICES[symbol]
    total = round(price * quantity, 2)

    item = {
        "symbol": symbol,
        "price": price,
        "quantity": quantity,
        "total": total,
        "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    portfolio.append(item)

    response = {
        "item": item
    }

    response.update(get_portfolio_summary())

    return jsonify(response), 201


@app.delete("/api/investments")
def clear_investments():
    """
    Clears all portfolio items.
    """
    portfolio.clear()

    return jsonify(get_portfolio_summary())


@app.post("/api/save")
def save_portfolio():
    """
    Saves portfolio to CSV or TXT file.
    """
    data = request.get_json(silent=True) or {}

    file_format = str(data.get("format", "csv")).strip().lower()

    if not portfolio:
        return jsonify({
            "error": "Portfolio is empty. Add an investment before saving."
        }), 400

    if file_format == "csv":
        filename = "investments.csv"

        with open(filename, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)

            writer.writerow([
                "Symbol",
                "Price",
                "Quantity",
                "Total",
                "Added At"
            ])

            for item in portfolio:
                writer.writerow([
                    item["symbol"],
                    item["price"],
                    item["quantity"],
                    item["total"],
                    item["added_at"]
                ])

    elif file_format == "txt":
        filename = "investments.txt"

        total_value = sum(item["total"] for item in portfolio)

        with open(filename, "w", encoding="utf-8") as file:
            file.write("Stock Investment Report\n")
            file.write("=" * 35 + "\n")

            for item in portfolio:
                file.write(
                    f"{item['symbol']}: "
                    f"{item['quantity']} shares x "
                    f"${item['price']:.2f} = "
                    f"${item['total']:.2f}\n"
                )

            file.write("=" * 35 + "\n")
            file.write(f"Total Investment: ${total_value:.2f}\n")
            file.write(
                f"Generated At: "
                f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            )

    else:
        return jsonify({
            "error": "Unsupported file format. Use 'csv' or 'txt'."
        }), 400

    return jsonify({
        "message": f"Portfolio saved to {filename}",
        "filename": filename
    })


if __name__ == "__main__":
    app.run(debug=True)
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import time
import sqlite3

app = Flask(__name__)
CORS(app)


DATABASE = "api_monitor.db"


# ============================================================
# APIs TO MONITOR
# ============================================================

apis = [
    {
        "name": "JSONPlaceholder",
        "url": "https://jsonplaceholder.typicode.com/posts/1"
    },
    {
        "name": "GitHub API",
        "url": "https://api.github.com"
    },
    {
        "name": "Open Meteo",
        "url": "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=temperature_2m"
    }
]


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_database():

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_history (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            api_name TEXT,

            api_url TEXT,

            status TEXT,

            status_code INTEGER,

            response_time_ms REAL,

            checked_at TEXT

        )
    """)

    connection.commit()

    connection.close()


# ============================================================
# SAVE API RESULT
# ============================================================

def save_result(result, check_time):

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO api_history
        (
            api_name,
            api_url,
            status,
            status_code,
            response_time_ms,
            checked_at
        )

        VALUES (?, ?, ?, ?, ?, ?)
    """, (

        result["name"],

        result["url"],

        result["status"],

        result["status_code"],

        result["response_time_ms"],

        check_time

    ))

    connection.commit()

    connection.close()


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return jsonify({

        "message":
            "API Health Monitor Backend is running"

    })


# ============================================================
# CHECK ALL APIs
# ============================================================

@app.route("/check-all")
def check_all():

    results = []


    # --------------------------------------------------------
    # IMPORTANT:
    #
    # One timestamp is created for the complete monitoring
    # cycle.
    #
    # Therefore all APIs checked during this request receive
    # exactly the same "checked_at" value.
    # --------------------------------------------------------

    check_time = time.strftime(
        "%Y-%m-%d %H:%M:%S"
    )


    for api in apis:

        try:

            start_time = time.time()


            response = requests.get(

                api["url"],

                timeout=5

            )


            end_time = time.time()


            response_time = round(

                (end_time - start_time) * 1000,

                2

            )


            # ------------------------------------------------
            # DETERMINE STATUS
            # ------------------------------------------------

            if response.status_code == 200:

                if response_time < 1000:

                    status = "Healthy"

                else:

                    status = "Slow"

            else:

                status = "Failed"


            # ------------------------------------------------
            # CREATE RESULT
            # ------------------------------------------------

            result = {

                "name":
                    api["name"],

                "url":
                    api["url"],

                "status":
                    status,

                "status_code":
                    response.status_code,

                "response_time_ms":
                    response_time

            }


            results.append(result)


            # ------------------------------------------------
            # SAVE RESULT USING THE SAME CHECK TIME
            # ------------------------------------------------

            save_result(

                result,

                check_time

            )


        except requests.exceptions.RequestException as error:

            # ------------------------------------------------
            # API FAILED
            # ------------------------------------------------

            result = {

                "name":
                    api["name"],

                "url":
                    api["url"],

                "status":
                    "Failed",

                "status_code":
                    0,

                "response_time_ms":
                    None,

                "error":
                    str(error)

            }


            results.append(result)


            # ------------------------------------------------
            # SAVE FAILED RESULT WITH THE SAME CHECK TIME
            # ------------------------------------------------

            save_result(

                result,

                check_time

            )


    return jsonify(results)


# ============================================================
# GET SAVED HISTORY
# ============================================================

@app.route("/history")
def get_history():

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            api_name,
            api_url,
            status,
            status_code,
            response_time_ms,
            checked_at

        FROM api_history

        ORDER BY id ASC
    """)


    rows = cursor.fetchall()

    connection.close()


    history = []


    for row in rows:

        history.append({

            "name":
                row[0],

            "url":
                row[1],

            "status":
                row[2],

            "status_code":
                row[3],

            "response_time_ms":
                row[4],

            "time":
                row[5]

        })


    return jsonify(history)


# ============================================================
# GET UPTIME STATISTICS
# ============================================================

@app.route("/uptime")
def get_uptime():

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()


    cursor.execute("""
        SELECT

            api_name,

            COUNT(*) AS total_checks,

            SUM(
                CASE
                    WHEN status != 'Failed'
                    THEN 1
                    ELSE 0
                END
            ) AS successful_checks

        FROM api_history

        GROUP BY api_name
    """)


    rows = cursor.fetchall()

    connection.close()


    uptime_data = []


    for row in rows:

        api_name = row[0]

        total_checks = row[1]

        successful_checks = row[2] or 0


        failed_checks = (

            total_checks -
            successful_checks

        )


        if total_checks > 0:

            uptime_percentage = round(

                (
                    successful_checks /
                    total_checks
                ) * 100,

                2

            )

        else:

            uptime_percentage = 0


        uptime_data.append({

            "name":
                api_name,

            "total_checks":
                total_checks,

            "successful_checks":
                successful_checks,

            "failed_checks":
                failed_checks,

            "uptime_percentage":
                uptime_percentage

        })


    return jsonify(uptime_data)


# ============================================================
# RESPONSE TIME STATISTICS
# ============================================================

@app.route("/statistics")
def get_statistics():

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()


    cursor.execute("""
        SELECT

            api_name,

            AVG(response_time_ms),

            MIN(response_time_ms),

            MAX(response_time_ms),

            COUNT(response_time_ms)

        FROM api_history

        WHERE response_time_ms IS NOT NULL

        GROUP BY api_name
    """)


    rows = cursor.fetchall()

    connection.close()


    statistics = []


    for row in rows:

        statistics.append({

            "name":
                row[0],

            "average_response_time_ms":
                round(row[1], 2)
                if row[1] is not None
                else 0,

            "minimum_response_time_ms":
                round(row[2], 2)
                if row[2] is not None
                else 0,

            "maximum_response_time_ms":
                round(row[3], 2)
                if row[3] is not None
                else 0,

            "total_response_measurements":
                row[4]

        })


    return jsonify(statistics)


# ============================================================
# API HEALTH SCORE
# ============================================================

@app.route("/health-score")
def get_health_score():

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()


    cursor.execute("""
        SELECT

            api_name,

            AVG(response_time_ms),

            SUM(
                CASE
                    WHEN status != 'Failed'
                    THEN 1
                    ELSE 0
                END
            ),

            COUNT(*)

        FROM api_history

        GROUP BY api_name
    """)


    rows = cursor.fetchall()

    connection.close()


    health_scores = []


    for row in rows:

        api_name = row[0]

        average_response_time = row[1] or 0

        successful_checks = row[2] or 0

        total_checks = row[3] or 0


        # ----------------------------------------------------
        # UPTIME SCORE
        # ----------------------------------------------------

        if total_checks > 0:

            uptime_percentage = (

                successful_checks /
                total_checks

            ) * 100

        else:

            uptime_percentage = 0


        uptime_score = (

            uptime_percentage / 100

        ) * 50


        # ----------------------------------------------------
        # RESPONSE TIME SCORE
        # ----------------------------------------------------

        if average_response_time <= 500:

            response_score = 50

        elif average_response_time <= 1000:

            response_score = 40

        elif average_response_time <= 2000:

            response_score = 25

        elif average_response_time <= 3000:

            response_score = 10

        else:

            response_score = 0


        # ----------------------------------------------------
        # FINAL HEALTH SCORE
        # ----------------------------------------------------

        health_score = round(

            uptime_score +
            response_score,

            2

        )


        # ----------------------------------------------------
        # RATING
        # ----------------------------------------------------

        if health_score >= 90:

            rating = "Excellent"

        elif health_score >= 75:

            rating = "Good"

        elif health_score >= 50:

            rating = "Needs Attention"

        else:

            rating = "Critical"


        health_scores.append({

            "name":
                api_name,

            "health_score":
                health_score,

            "rating":
                rating,

            "uptime_percentage":
                round(
                    uptime_percentage,
                    2
                ),

            "average_response_time_ms":
                round(
                    average_response_time,
                    2
                )

        })


    return jsonify(health_scores)


# ============================================================
# API AVAILABILITY TREND
# ============================================================

@app.route("/availability-trend")
def get_availability_trend():

    connection = sqlite3.connect(DATABASE)

    cursor = connection.cursor()


    cursor.execute("""
        SELECT

            api_name,

            checked_at,

            status

        FROM api_history

        ORDER BY id ASC
    """)


    rows = cursor.fetchall()

    connection.close()


    trend_data = {}


    for row in rows:

        api_name = row[0]

        checked_at = row[1]

        status = row[2]


        if api_name not in trend_data:

            trend_data[api_name] = []


        if status == "Failed":

            availability = "Unavailable"

        else:

            availability = "Available"


        trend_data[api_name].append({

            "time":
                checked_at,

            "status":
                status,

            "availability":
                availability

        })


    result = []


    for api_name, records in trend_data.items():

        result.append({

            "name":
                api_name,

            "checks":
                records

        })


    return jsonify(result)


# ============================================================
# START APPLICATION
# ============================================================

if __name__ == "__main__":

    init_database()

    app.run(

        debug=True,

        port=5000

    )
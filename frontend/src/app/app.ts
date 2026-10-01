import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {

  apiData: any[] = [];

  history: any[] = [];

  uptimeData: any[] = [];

  statisticsData: any[] = [];

  healthScoreData: any[] = [];

  availabilityTrendData: any[] = [];

  loading = false;

  error = '';

  chart: Chart | undefined;

  monitoringInterval: ReturnType<typeof setInterval> | null = null;

  searchText = '';

  statusFilter = 'All';

  lastChecked = '';

  monitoringActive = false;

  readonly MAX_HISTORY_DISPLAY = 15;

  readonly MONITORING_INTERVAL = 30000;


  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}


  // ==========================================================
  // START MONITORING
  // ==========================================================

  ngOnInit() {

    this.monitoringActive = true;

    this.loadHistory();

    this.loadUptime();

    this.loadStatistics();

    this.loadHealthScores();

    this.loadAvailabilityTrend();


    // Run one check when the dashboard starts

    this.checkAllApis();


    // Automatic check every 30 seconds

    if (!this.monitoringInterval) {

      this.monitoringInterval = setInterval(() => {

        if (!this.loading) {

          this.checkAllApis();

        }

      }, this.MONITORING_INTERVAL);

    }

  }


  // ==========================================================
  // STOP MONITORING
  // ==========================================================

  ngOnDestroy() {

    this.monitoringActive = false;


    if (this.monitoringInterval !== null) {

      clearInterval(this.monitoringInterval);

      this.monitoringInterval = null;

    }


    if (this.chart) {

      this.chart.destroy();

      this.chart = undefined;

    }

  }


  // ==========================================================
  // LOAD HISTORY
  // ==========================================================

  loadHistory() {

    this.http.get<any[]>(
      'http://127.0.0.1:5000/history'
    )
    .subscribe({

      next: (data) => {

        console.log('HISTORY LOADED:', data);

        this.history =
          this.convertHistory(data);

        this.cdr.detectChanges();


        setTimeout(() => {

          this.updateChart();

        }, 100);

      },


      error: (err) => {

        console.log('HISTORY ERROR:', err);

      }

    });

  }


  // ==========================================================
  // LOAD UPTIME
  // ==========================================================

  loadUptime() {

    this.http.get<any[]>(
      'http://127.0.0.1:5000/uptime'
    )
    .subscribe({

      next: (data) => {

        console.log('UPTIME LOADED:', data);

        this.uptimeData = data;

        this.cdr.detectChanges();

      },


      error: (err) => {

        console.log('UPTIME ERROR:', err);

      }

    });

  }


  // ==========================================================
  // LOAD STATISTICS
  // ==========================================================

  loadStatistics() {

    this.http.get<any[]>(
      'http://127.0.0.1:5000/statistics'
    )
    .subscribe({

      next: (data) => {

        console.log('STATISTICS LOADED:', data);

        this.statisticsData = data;

        this.cdr.detectChanges();

      },


      error: (err) => {

        console.log('STATISTICS ERROR:', err);

      }

    });

  }


  // ==========================================================
  // LOAD HEALTH SCORES
  // ==========================================================

  loadHealthScores() {

    this.http.get<any[]>(
      'http://127.0.0.1:5000/health-score'
    )
    .subscribe({

      next: (data) => {

        console.log('HEALTH SCORES LOADED:', data);

        this.healthScoreData = data;

        this.cdr.detectChanges();

      },


      error: (err) => {

        console.log('HEALTH SCORE ERROR:', err);

      }

    });

  }


  // ==========================================================
  // LOAD AVAILABILITY TREND
  // ==========================================================

  loadAvailabilityTrend() {

    this.http.get<any[]>(
      'http://127.0.0.1:5000/availability-trend'
    )
    .subscribe({

      next: (data) => {

        console.log(
          'AVAILABILITY TREND LOADED:',
          data
        );

        this.availabilityTrendData = data;

        this.cdr.detectChanges();

      },


      error: (err) => {

        console.log(
          'AVAILABILITY TREND ERROR:',
          err
        );

      }

    });

  }


  // ==========================================================
  // CHECK ALL APIs
  // ==========================================================

  checkAllApis() {

    console.log('Checking all APIs...');

    this.loading = true;

    this.error = '';


    this.http.get<any[]>(
      'http://127.0.0.1:5000/check-all'
    )
    .subscribe({

      next: (data) => {

        console.log('DATA RECEIVED:', data);

        this.apiData = data;


        this.lastChecked =
          new Date().toLocaleTimeString();


        // Refresh all dashboard data

        this.loadHistory();

        this.loadUptime();

        this.loadStatistics();

        this.loadHealthScores();

        this.loadAvailabilityTrend();


        this.loading = false;

        this.cdr.detectChanges();

      },


      error: (err) => {

        console.log('ERROR:', err);

        this.error =
          'Unable to connect to backend';

        this.loading = false;

        this.cdr.detectChanges();

      }

    });

  }


  // ==========================================================
  // FILTER APIs
  // ==========================================================

  get filteredApis(): any[] {

    const search =
      this.searchText
        .toLowerCase()
        .trim();


    return this.apiData.filter(
      api => {

        const matchesSearch =
          !search ||
          api.name
            .toLowerCase()
            .includes(search);


        const matchesStatus =
          this.statusFilter === 'All' ||
          api.status === this.statusFilter;


        return matchesSearch &&
               matchesStatus;

      }
    );

  }


  // ==========================================================
  // GET UPTIME
  // ==========================================================

  getUptime(apiName: string): any {

    return this.uptimeData.find(
      uptime =>
        uptime.name === apiName
    );

  }


  // ==========================================================
  // GET STATISTICS
  // ==========================================================

  getStatistics(apiName: string): any {

    return this.statisticsData.find(
      statistics =>
        statistics.name === apiName
    );

  }


  // ==========================================================
  // GET HEALTH SCORE
  // ==========================================================

  getHealthScore(apiName: string): any {

    return this.healthScoreData.find(
      health =>
        health.name === apiName
    );

  }


  // ==========================================================
  // GET AVAILABILITY TREND
  // ==========================================================

  getAvailabilityTrend(apiName: string): any {

    return this.availabilityTrendData.find(
      trend =>
        trend.name === apiName
    );

  }


  // ==========================================================
  // CLEAR SEARCH
  // ==========================================================

  clearSearch() {

    this.searchText = '';

  }


  // ==========================================================
  // CONVERT HISTORY
  //
  // Shows only the latest 15 COMPLETE monitoring cycles.
  //
  // A complete cycle must contain:
  // JSONPlaceholder
  // GitHub API
  // Open Meteo
  //
  // Old/irregular records are not deleted from the database.
  // They are simply not shown in Performance History.
  // ==========================================================

  convertHistory(data: any[]) {

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {

      return [];

    }


    // --------------------------------------------------------
    // GROUP DATABASE RECORDS BY CHECK TIME
    // --------------------------------------------------------

    const grouped: {
      [key: string]: {
        time: string;
        timestamp: number;
        results: any[];
      }
    } = {};


    data.forEach(item => {

      const time = item.time;


      if (!grouped[time]) {

        grouped[time] = {

          time: time,

          timestamp:
            new Date(
              time.replace(' ', 'T')
            ).getTime(),

          results: []

        };

      }


      grouped[time].results.push({

        name: item.name,

        url: item.url,

        status: item.status,

        status_code: item.status_code,

        response_time_ms:
          item.response_time_ms

      });

    });


    // --------------------------------------------------------
    // REQUIRED APIs
    // --------------------------------------------------------

    const requiredApis = [

      'JSONPlaceholder',

      'GitHub API',

      'Open Meteo'

    ];


    // --------------------------------------------------------
    // KEEP ONLY COMPLETE CYCLES
    // --------------------------------------------------------

    const completeHistory =
      Object.values(grouped)
        .filter(record => {

          const names =
            record.results.map(
              item => item.name
            );


          return requiredApis.every(
            apiName =>
              names.includes(apiName)
          );

        });


    // --------------------------------------------------------
    // SORT NEWEST → OLDEST
    // --------------------------------------------------------

    completeHistory.sort(
      (a, b) =>
        b.timestamp - a.timestamp
    );


    // --------------------------------------------------------
    // TAKE LATEST 15 COMPLETE CYCLES
    // --------------------------------------------------------

    const latestHistory =
      completeHistory.slice(
        0,
        this.MAX_HISTORY_DISPLAY
      );


    // --------------------------------------------------------
    // RETURN OLDEST → NEWEST
    // --------------------------------------------------------

    return latestHistory.reverse();

  }


  // ==========================================================
  // COUNT STATUS
  // ==========================================================

  getCount(status: string): number {

    return this.apiData.filter(
      api =>
        api.status === status
    ).length;

  }


  // ==========================================================
  // UPDATE RESPONSE TIME CHART
  // ==========================================================

  updateChart() {

    const canvas =
      document.getElementById(
        'responseChart'
      ) as HTMLCanvasElement;


    if (!canvas) {

      return;

    }


    // Destroy previous chart

    if (this.chart) {

      this.chart.destroy();

    }


    // Get latest history

    const chartHistory =
      this.history.slice(
        -this.MAX_HISTORY_DISPLAY
      );


    // Chart labels

    const labels =
      chartHistory.map(
        record =>
          record.time
      );


    // API names

    const apiNames = [

      ...new Set(

        chartHistory.flatMap(
          record =>
            record.results.map(
              (api: any) =>
                api.name
            )
        )

      )

    ];


    // Create chart datasets

    const datasets =
      apiNames.map(
        (apiName: string) => {

          return {

            label: apiName,

            data:
              chartHistory.map(
                record => {

                  const api =
                    record.results.find(
                      (item: any) =>
                        item.name === apiName
                    );


                  return api?.response_time_ms
                    ?? null;

                }
              ),

            borderWidth: 2,

            tension: 0.3,

            fill: false

          };

        }
      );


    // Create Chart.js chart

    this.chart = new Chart(

      canvas,

      {

        type: 'line',


        data: {

          labels: labels,

          datasets: datasets

        },


        options: {

          responsive: true,

          maintainAspectRatio: false,


          scales: {

            y: {

              beginAtZero: true,


              title: {

                display: true,

                text:
                  'Response Time (ms)'

              }

            },


            x: {

              title: {

                display: true,

                text:
                  'Check Time'

              }

            }

          },


          plugins: {

            legend: {

              display: true

            },


            tooltip: {

              enabled: true

            }

          }

        }

      }

    );

  }

}
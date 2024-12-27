const STATS_FILE = './data/request_stats.json';
const TRACKED_ENDPOINTS = ['/image', '/scraping', '/doujindesu/search', '/doujindesu/searchtype', '/send-email'];

interface DailyStats {
    [monthKey: string]: {
        [dateKey: string]: number;
    };
}

interface MonthlyStats {
    [year: string]: {
        [monthKey: string]: number;
    };
}

interface Stats {
    dailyStats: DailyStats;
    monthlyStats: MonthlyStats;
    totalRequests: number;
}

interface StatisticsResponse {
    totalRequests: number;
    todayRequests: number;
    dailyStats: DailyStats;
    monthlyStats: MonthlyStats;
}

async function ensureStatsFile(): Promise<Stats> {
    try {
        const file = Bun.file(STATS_FILE);
        const exists = await file.exists();
        
        if (exists) {
            const data = await file.text();
            return JSON.parse(data);
        }
        
        const initialStats: Stats = {
            dailyStats: {},
            monthlyStats: {},
            totalRequests: 0,
        };
        await Bun.write(STATS_FILE, JSON.stringify(initialStats, null, 2));
        return initialStats;
    } catch (error) {
        console.error('Error in ensureStatsFile:', error);
        throw error;
    }
}

async function loadStats(): Promise<Stats> {
    try {
        const file = Bun.file(STATS_FILE);
        const data = await file.text();
        return JSON.parse(data);
    } catch {
        return await ensureStatsFile();
    }
}

async function saveStats(stats: Stats): Promise<void> {
    await Bun.write(STATS_FILE, JSON.stringify(stats, null, 2));
}

async function trackRequest(endpoint: string, method: string): Promise<void> {
    if (!TRACKED_ENDPOINTS.includes(endpoint) || 
        (endpoint === '/scraping' && method !== 'POST') ||
        (endpoint === '/send-email' && method !== 'POST')) {
        return;
    }

    const stats = await loadStats();
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Update daily stats
    if (!stats.dailyStats[monthKey]) {
        stats.dailyStats[monthKey] = {};
    }
    if (!stats.dailyStats[monthKey][dateKey]) {
        stats.dailyStats[monthKey][dateKey] = 0;
    }
    stats.dailyStats[monthKey][dateKey]++;

    // Update monthly stats
    if (!stats.monthlyStats[now.getFullYear()]) {
        stats.monthlyStats[now.getFullYear()] = {};
    }
    if (!stats.monthlyStats[now.getFullYear()][monthKey]) {
        stats.monthlyStats[now.getFullYear()][monthKey] = 0;
    }
    stats.monthlyStats[now.getFullYear()][monthKey]++;

    // Update total requests
    stats.totalRequests++;

    await saveStats(stats);
}

export async function getStatistics(): Promise<StatisticsResponse> {
    const stats = await loadStats();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return {
        totalRequests: stats.totalRequests,
        todayRequests: stats.dailyStats[currentMonth]?.[today] || 0,
        dailyStats: stats.dailyStats,
        monthlyStats: stats.monthlyStats
    };
}

export { trackRequest };

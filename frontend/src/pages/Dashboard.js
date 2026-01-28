// src/pages/Dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const KPI = ({ title, value, delta, small }) => (
  <div className="rounded-2xl bg-white p-5 border shadow-card">
    <div className="flex items-center gap-3">
      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
        <Layout size={20} />
      </div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
        {small && <div className="text-xs text-gray-400 mt-1">{small}</div>}
      </div>
    </div>
    {delta !== undefined && (
      <div className={`mt-3 text-sm ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
        {delta >= 0 ? `▲ ${delta}%` : `▼ ${Math.abs(delta)}%`}
      </div>
    )}
  </div>
);

const COLORS = ["#4C6EF5", "#2DD4BF", "#FDBA74", "#F87171", "#A78BFA"];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [enrollmentBreakdown, setEnrollmentBreakdown] = useState([]);

  // fallback sample data
  const sampleKpis = {
    availableSlots: 12,
    bookedSessions: 3,
    daysAvailable: 5,
    activeCourses: 7,
  };

  const sampleWeekly = [
    { day: "Mon", sessions: 2 },
    { day: "Tue", sessions: 4 },
    { day: "Wed", sessions: 3 },
    { day: "Thu", sessions: 6 },
    { day: "Fri", sessions: 5 },
    { day: "Sat", sessions: 2 },
    { day: "Sun", sessions: 1 },
  ];

  const sampleTop = [
    { name: "React Basics", enrollments: 24 },
    { name: "Data Structures", enrollments: 18 },
    { name: "UI Design", enrollments: 14 },
  ];

  const sampleBreakdown = [
    { name: "Pending", value: 12 },
    { name: "Accepted", value: 27 },
    { name: "Rejected", value: 4 },
  ];

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoading(true);

      try {
        // try fetching KPIs (you can adapt endpoints below to your backend)
        const [kRes, wRes, tRes, bRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/analytics/kpis/`),
          fetch(`${API_BASE}/api/analytics/weekly/`),
          fetch(`${API_BASE}/api/analytics/top-courses/`),
          fetch(`${API_BASE}/api/analytics/enrollment-breakdown/`),
        ]);

        if (!mounted) return;

        // KPIs
        if (kRes.status === "fulfilled" && kRes.value.ok) {
          const kd = await kRes.value.json();
          setKpis(kd);
        } else {
          setKpis(sampleKpis);
        }

        // weekly
        if (wRes.status === "fulfilled" && wRes.value.ok) {
          setWeeklyData(await wRes.value.json());
        } else {
          setWeeklyData(sampleWeekly);
        }

        // top courses
        if (tRes.status === "fulfilled" && tRes.value.ok) {
          setTopCourses(await tRes.value.json());
        } else {
          setTopCourses(sampleTop);
        }

        // breakdown
        if (bRes.status === "fulfilled" && bRes.value.ok) {
          setEnrollmentBreakdown(await bRes.value.json());
        } else {
          setEnrollmentBreakdown(sampleBreakdown);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        // fall back
        setKpis(sampleKpis);
        setWeeklyData(sampleWeekly);
        setTopCourses(sampleTop);
        setEnrollmentBreakdown(sampleBreakdown);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalEnrollments = useMemo(() => {
    return enrollmentBreakdown.reduce((s, x) => s + (x.value || 0), 0);
  }, [enrollmentBreakdown]);

  if (loading)
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="text-center text-gray-600">Loading dashboard...</div>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Layout size={28} className="text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500">Analytics overview — sessions, enrollments & slots</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50">Export</button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700">
            New Course
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mt-6">
        <KPI title="Available Slots" value={kpis?.availableSlots ?? sampleKpis.availableSlots} delta={6} />
        <KPI title="Booked Sessions" value={kpis?.bookedSessions ?? sampleKpis.bookedSessions} delta={-4} />
        <KPI title="Days Available" value={kpis?.daysAvailable ?? sampleKpis.daysAvailable} />
        <KPI title="Active Courses" value={kpis?.activeCourses ?? sampleKpis.activeCourses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Weekly line chart */}
        <div className="col-span-2 rounded-2xl bg-white p-6 border shadow-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Weekly Sessions</h3>
            <div className="text-sm text-gray-500">Last 7 days</div>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#4C6EF5" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: pie & bar */}
        <div className="rounded-2xl bg-white p-6 border shadow-card">
          <h3 className="font-semibold text-lg mb-3">Enrollment Status</h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enrollmentBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  label
                >
                  {enrollmentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Total: <strong className="text-gray-700">{totalEnrollments}</strong>
          </div>
        </div>
      </div>

      {/* Top courses bar chart */}
      <div className="rounded-2xl bg-white p-6 border shadow-card mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Top Courses by Enrollment</h3>
          <div className="text-sm text-gray-500">This month</div>
        </div>

        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCourses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="enrollments" fill="#2DD4BF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
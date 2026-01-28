// src/pages/StudentTimeslotView.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

const API_BASE = "http://127.0.0.1:8000";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudentTimeslotView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [course, setCourse] = useState(null);
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch course details
        const courseRes = await authFetch(`${API_BASE}/api/courses/${courseId}/`);
        setCourse(courseRes.data);

        // Fetch instructor weekly timeslots
        const res = await authFetch(`${API_BASE}/api/courses/${courseId}/timeslots/`);
        if (Array.isArray(res.data)) {
          const map = {};
          for (let d = 0; d < 7; d++) map[d] = new Set();
          res.data.forEach((slot) => {
            const dow = Number(slot.day_of_week);
            const hr = Number(slot.hour);
            if (!isNaN(dow) && !isNaN(hr)) map[dow].add(hr);
          });
          setSlots(map);
        }
      } catch (err) {
        console.error("Error loading timeslots:", err);
      }
      setLoading(false);
    };

    loadData();
  }, [courseId, authFetch]);

  if (loading) return <div className="p-6 text-center">Loading timeslots...</div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-5 py-2 bg-gray-400 text-white rounded-lg"
      >
        Back
      </button>

      <h2 className="text-2xl font-bold mb-4 text-indigo-700">
        {course?.title} – Instructor Availability
      </h2>

      <p className="text-gray-600 mb-6">
        These are the available weekly time slots. You cannot modify them.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-100">Hour</th>
              {DAYS.map((d) => (
                <th key={d} className="border p-2 bg-gray-100 text-center">{d}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
              <tr key={hour}>
                <td className="border p-2 font-semibold text-center">{hour}:00</td>

                {DAYS.map((_, dayIdx) => {
                  const isAvailable = slots[dayIdx]?.has(hour);
                  return (
                    <td
                      key={dayIdx}
                      className={`border p-2 text-center ${
                        isAvailable ? "bg-green-200" : "bg-gray-200"
                      }`}
                    >
                      {isAvailable ? "Available" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
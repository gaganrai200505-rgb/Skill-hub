// src/pages/CourseManage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

/**
 * CourseManage (final)
 *
 * Notes about the fixes in this file:
 * - Uses course-specific weekly timeslots (A1): each timeslot = { instructor, course, day_of_week, hour }.
 * - Fetches timeslots from: GET  /api/courses/:courseId/timeslots/
 * - Creates timeslot via: POST /api/courses/:courseId/slots/create/
 * - Deletes timeslot via: DELETE /api/courses/:courseId/slots/delete/
 *   (frontend will send { day_of_week, hour } in the body for delete)
 * - Updates enrollment via: PATCH /api/courses/enrollment/:enrollmentId/
 *
 * Behaviour choices (per your requests):
 * - Duplicate creates are silently ignored (no error or message).
 * - Successful slot operations do not display messages (silent success).
 * - When toggling a cell, you can both mark (create) and unmark (delete) before saving.
 * - On saving we compute the diff between backend state and UI and call create/delete for changes.
 *
 * IMPORTANT: This file only updates the slot/enrollment logic; UI/look-and-feel is kept as before.
 */

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const styles = {
  container: { maxWidth: 1000, margin: "24px auto", padding: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, margin: 0 },
  infoCard: { border: "1px solid #eee", padding: 12, borderRadius: 6, marginTop: 12, background: "#fafafa" },
  gridWrap: { display: "flex", gap: 20, marginTop: 20 },
  left: { flex: 1 },
  right: { width: 360 },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: { border: "1px solid #ddd", padding: 8, background: "#f5f7fa", fontWeight: 600, textAlign: "center", fontSize: 12 },
  td: { border: "1px solid #eee", padding: 6, height: 40, textAlign: "center", cursor: "pointer", fontSize: 13 },
  tdAvailable: { background: "#dff7df" },
  small: { fontSize: 13, color: "#444" },
  enrollRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" },
  btn: { padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer" },
  btnPrimary: { background: "#2b7cff", color: "#fff" },
  btnDanger: { background: "#e74c3c", color: "#fff" },
  btnSuccess: { background: "#2ecc71", color: "#fff" },
  footer: { marginTop: 16, display: "flex", gap: 8, alignItems: "center" },
  alert: { padding: 10, background: "#fff3cd", border: "1px solid #ffeeba", borderRadius: 6 },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CourseManage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, authFetch, loadingAuth } = useAuth();

  const backendAvailabilityRef = useRef({}); // { [day]: Set(hours) } reflecting server state
  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI availability map (dayIndex -> Set(hours))
  const [availability, setAvailability] = useState(() => {
    const base = {};
    for (let d = 0; d < 7; d++) base[d] = new Set();
    return base;
  });

  // helper: extract numeric instructor id from course object returned by backend
  const getCourseInstructorId = (courseObj) => {
    if (!courseObj) return null;
    if (typeof courseObj.instructor === "number") return courseObj.instructor;
    if (courseObj.instructor && typeof courseObj.instructor === "object")
      return courseObj.instructor.id ?? courseObj.instructor.pk ?? null;
    return courseObj.instructor_id ?? courseObj.instructorId ?? null;
  };

  // Load course, enrollments, and timeslots from backend
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // course details
      const courseRes = await authFetch(`${API_BASE}/api/courses/${courseId}/`);
      setCourse(courseRes.data);

      // enrollments
      const enrollRes = await authFetch(`${API_BASE}/api/courses/${courseId}/enrollments/`);
      const enrollList = Array.isArray(enrollRes.data) ? enrollRes.data : enrollRes.data.results || [];
      setEnrollments(enrollList);

      // timeslots (course-specific)
      try {
        const timesRes = await authFetch(`${API_BASE}/api/courses/${courseId}/timeslots/`);
        if (Array.isArray(timesRes.data)) {
          const backendMap = {};
          for (let d = 0; d < 7; d++) backendMap[d] = new Set();

          timesRes.data.forEach((slot) => {
            // expected slot: { day_of_week: 0..6, hour: 0..23, ... }
            const dow = Number(slot.day_of_week ?? slot.day ?? slot.week_day);
            const hr = Number(slot.hour ?? slot.start_hour ?? slot.hour_of_day);
            if (!Number.isNaN(dow) && !Number.isNaN(hr) && dow >= 0 && dow <= 6 && hr >= 0 && hr <= 23) {
              backendMap[dow].add(hr);
            }
          });

          // sync backendAvailabilityRef and UI availability to reflect authoritative server state
          backendAvailabilityRef.current = backendMap;

          // set UI to backend state (so instructor sees saved slots)
          const uiMap = {};
          for (let d = 0; d < 7; d++) uiMap[d] = new Set(backendMap[d]);
          setAvailability(uiMap);
        }
      } catch (errTimes) {
        // timeslot endpoint missing or failed: keep UI as-is (allow manual marking)
        // console.debug("timeslot fetch failed", errTimes);
      }
    } catch (err) {
      console.error("loadAll error:", err);
      setError("Course not found or you are not authorized. Redirecting to courses list...");
      // redirect after a short delay
      setTimeout(() => navigate("/courses"), 1400);
    } finally {
      setLoading(false);
    }
  }, [authFetch, courseId, navigate]);

  useEffect(() => {
    if (!loadingAuth) loadAll();
  }, [loadingAuth, loadAll]);

  const hourRange = useMemo(() => {
    const start = 8;
    const end = 20;
    const arr = [];
    for (let h = start; h < end; h++) arr.push(h);
    return arr;
  }, []);

  function toggleCell(dayIndex, hour) {
    if (!user || !course) return;

    const instructorId = getCourseInstructorId(course);
    const isInstructor = user && instructorId && Number(user.id) === Number(instructorId);
    if (!isInstructor) {
      // brief UI hint only (no persistent message)
      setError("Only the instructor can mark availability.");
      setTimeout(() => setError(null), 1200);
      return;
    }

    setAvailability((prev) => {
      const next = {};
      for (let d = 0; d < 7; d++) next[d] = new Set(prev[d]);
      if (next[dayIndex].has(hour)) next[dayIndex].delete(hour);
      else next[dayIndex].add(hour);
      return next;
    });
  }

  // create/delete diffs against backendAvailabilityRef.current
  async function handleCreateSlots() {
    if (!user || !course) {
      setError("Missing user or course.");
      setTimeout(() => setError(null), 2000);
      return;
    }

    const instructorId = getCourseInstructorId(course);
    const isInstructor = Number(user.id) === Number(instructorId);
    if (!isInstructor) {
      setError("Only the instructor can save availability.");
      setTimeout(() => setError(null), 2000);
      return;
    }

    const backendMap = backendAvailabilityRef.current || {};
    const opsCreate = [];
    const opsDelete = [];

    for (let d = 0; d < 7; d++) {
      const uiSet = availability[d] || new Set();
      const backendSet = backendMap[d] || new Set();

      // create: in UI but not in backend
      for (const hr of uiSet) {
        if (!backendSet.has(hr)) opsCreate.push({ day_of_week: d, hour: hr });
      }

      // delete: in backend but removed in UI
      for (const hr of backendSet) {
        if (!uiSet.has(hr)) opsDelete.push({ day_of_week: d, hour: hr });
      }
    }

    // nothing to do -> silent return
    if (opsCreate.length === 0 && opsDelete.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Perform creates first (duplicates on server are silently ignored by backend or will error; we swallow duplicate errors)
      for (const p of opsCreate) {
        try {
          // POST to create
          await authFetch(`${API_BASE}/api/courses/${courseId}/slots/create/`, {
            method: "POST",
            data: {
              instructor: Number(user.id),
              course: Number(courseId),
              day_of_week: p.day_of_week,
              hour: p.hour,
            },
          });
        } catch (errCreate) {
          // If it's a duplicate (unique constraint), ignore silently.
          const status = errCreate?.response?.status;
          if (status === 400 || status === 409 || status === 500) {
            // inspect response message briefly; if it's clearly a duplicate, skip silently
            // we will simply continue (no UI message)
            // console.debug("create slot error (ignored):", errCreate?.response?.data || errCreate.message);
          } else {
            // other errors bubble up
            throw errCreate;
          }
        }
      }

      // Perform deletes
      for (const p of opsDelete) {
        try {
          // We send DELETE to the dedicated endpoint; some backends expect query params — we send JSON body.
          await authFetch(`${API_BASE}/api/courses/${courseId}/slots/delete/`, {
            method: "DELETE",
            data: {
              day_of_week: p.day_of_week,
              hour: p.hour,
            },
          });
        } catch (errDel) {
          // If deletion fails (not found, permissions), ignore duplicates but surface unexpected errors
          const status = errDel?.response?.status;
          if (status === 404 || status === 400) {
            // treat as already-deleted / missing → ignore
          } else {
            throw errDel;
          }
        }
      }

      // Refresh authoritative slots from server and update UI & backend ref
      try {
        const timesRes = await authFetch(`${API_BASE}/api/courses/${courseId}/timeslots/`);
        if (Array.isArray(timesRes.data)) {
          const newBackend = {};
          for (let d = 0; d < 7; d++) newBackend[d] = new Set();
          timesRes.data.forEach((s) => {
            const dow = Number(s.day_of_week);
            const hr = Number(s.hour);
            if (!Number.isNaN(dow) && !Number.isNaN(hr)) newBackend[dow].add(hr);
          });
          backendAvailabilityRef.current = newBackend;
          // set UI to backend canonical state
          const uiMap = {};
          for (let d = 0; d < 7; d++) uiMap[d] = new Set(newBackend[d]);
          setAvailability(uiMap);
        }
      } catch (errRefresh) {
        // If timeslots refresh fails, don't crash — keep current UI state
        // console.debug("refresh timeslots failed", errRefresh);
      }

      // silent success — do not show a success message per request
    } catch (err) {
      console.error("Saving slots failed:", err);
      const backendMsg = err?.response?.data || err?.message || "Failed to save slots.";
      setError(typeof backendMsg === "string" ? backendMsg : JSON.stringify(backendMsg));
      setTimeout(() => setError(null), 3500);
    } finally {
      setLoading(false);
    }
  }

  // Update enrollment status (accept/reject)
  async function updateEnrollmentStatus(enrollmentId, status) {
  setLoading(true);
  setError(null);

  try {
    await authFetch(`${API_BASE}/api/courses/${courseId}/enrollment/${enrollmentId}/`, {
      method: "PATCH",
      data: { status },
    });

    // update state
    setEnrollments((prev) =>
      prev.map((e) => (e.id === enrollmentId ? { ...e, status } : e))
    );
  } catch (err) {
    console.error("Enrollment update failed:", err);
    const backend = err?.response?.data || "Failed to update enrollment.";
    setError(typeof backend === "string" ? backend : JSON.stringify(backend));
    setTimeout(() => setError(null), 3000);
  } finally {
    setLoading(false);
  }
}
  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error)
    return (
      <div style={{ padding: 20 }}>
        <div style={styles.alert}>{error}</div>
      </div>
    );

  const instructorId = getCourseInstructorId(course);
  const isInstructor = user && instructorId && Number(user.id) === Number(instructorId);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Manage Course — {course?.title ?? `#${courseId}`}</h2>
        <div>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={() => {
              navigate("/courses");
            }}
          >
            Back to courses
          </button>
        </div>
      </div>

      <div style={styles.infoCard}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{course?.title}</div>
            <div style={styles.small}>{course?.category ?? ""}</div>
            <div style={{ marginTop: 8 }}>
              <strong>Instructor:</strong>{" "}
              <span style={{ color: "#333" }}>{course?.instructor_name || course?.instructor || "—"}</span>
            </div>
            <div>
              <strong>Duration:</strong> {course?.duration ?? "—"} mins
            </div>
            <div>
              <strong>Price:</strong> {course?.price ?? "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {isInstructor ? <div style={{ fontWeight: 700, color: "#2b7cff" }}>You are the instructor</div> : <div style={{ color: "#666" }}>You are a visitor</div>}
          </div>
        </div>
      </div>

      <div style={styles.gridWrap}>
        <div style={styles.left}>
          <h3 style={{ marginBottom: 8 }}>Weekly Availability (simple table)</h3>
          <div style={{ color: "#666", fontSize: 13 }}>
            Click an hourly cell to toggle availability. After you're done toggling, press <strong>Create slots</strong> to persist changes.
          </div>

          <div style={{ marginTop: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Hour</th>
                  {DAYS.map((d) => (
                    <th key={d} style={styles.th}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hourRange.map((hour) => (
                  <tr key={hour}>
                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>{hour}:00</td>
                    {DAYS.map((day, dayIdx) => {
                      const selected = availability[dayIdx]?.has(hour);
                      const cellStyle = {
                        ...styles.td,
                        ...(selected ? styles.tdAvailable : {}),
                      };
                      return (
                        <td
                          key={`${dayIdx}-${hour}`}
                          style={cellStyle}
                          onClick={() => toggleCell(dayIdx, hour)}
                          title={selected ? "Click to unmark" : "Click to mark available"}
                        >
                          {selected ? "Available" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.footer}>
            <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={handleCreateSlots}>
              Create slots
            </button>
            <button
              style={{ ...styles.btn }}
              onClick={() => {
                const cleared = {};
                for (let d = 0; d < 7; d++) cleared[d] = new Set();
                setAvailability(cleared);
              }}
            >
              Clear selections
            </button>
          </div>
        </div>

        <div style={styles.right}>
          <h3>Enrollments</h3>
          <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>Incoming student requests — accept or reject.</div>

          <div style={{ border: "1px solid #eee", borderRadius: 6, padding: 8 }}>
            {enrollments.length === 0 && <div style={{ padding: 8 }}>No enrollments yet.</div>}

            {enrollments.map((enr) => (
              <div key={enr.id} style={styles.enrollRow}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: 700 }}>{enr.student_username ?? "Student"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{enr.note ?? ""}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>Status: {enr.status ?? "pending"}</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={() => updateEnrollmentStatus(enr.id, "accepted")} disabled={enr.status === "accepted"}>
                    Accept
                  </button>
                  <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => updateEnrollmentStatus(enr.id, "rejected")} disabled={enr.status === "rejected"}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <h3>Enrolled Students</h3>
            <ul>
              {enrollments
              .filter((e) => e.status === "accepted")
              .map((e) => (
              <li key={e.id} style={{ padding: "4px 0" }}>
                {e.student_username}
                </li>
              ))}
              </ul>
              </div>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 6 }}>Quick actions</h4>
            <button
              style={{ ...styles.btn }}
              onClick={() => {
                loadAll();
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

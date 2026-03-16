// src/pages/Profile.js
import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { useAuth } from "../state/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

/**
 * Profile page (Option A - instructor manually adds timeslots)
 *
 * Uses existing backend endpoints (as in your repo):
 * - GET  /api/users/profile/
 * - PUT  /api/users/profile/update/
 * - GET  /api/users/skills/
 * - POST /api/users/skills/add/
 * - GET  /api/courses/
 * - POST /api/courses/create/
 * - POST /api/courses/<id>/enroll/
 * - GET  /api/users/timeslots/                (list instructor timeslots for logged-in user)
 * - POST /api/users/timeslots/create/
 * - DELETE /api/users/timeslots/<id>/
 *
 * If your backend uses slightly different paths adjust the URL strings below.
 */

const Profile = () => {
  const { user, accessToken, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Profile form state
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    contact: "",
    skills: [],
    profile_image: null,
  });

  // Helpful UI state
  const [skills, setSkills] = useState([]); // available skill options
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(false);

  // Courses / add course modal
  const [courses, setCourses] = useState([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");

  // Timeslots (instructor)
  const [timeslots, setTimeslots] = useState([]);
  const [tsStart, setTsStart] = useState("");
  const [tsEnd, setTsEnd] = useState("");
  const [tsNote, setTsNote] = useState("");
  const [tsLoading, setTsLoading] = useState(false);

  // Enrollment modal (student)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollingCourse, setEnrollingCourse] = useState(null);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  // ------------------- Helper fetch wrappers -------------------
  const authHeaders = (json = true) => {
    const h = { Authorization: `Bearer ${accessToken}` };
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const safeJson = async (res) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        return await res.json();
      } catch (e) {
        console.warn("Failed to parse JSON response", e);
        return null;
      }
    }
    return null;
  };

  // ------------------- Loaders -------------------
  useEffect(() => {
    // load profile & resources when accessToken present
    if (!accessToken) return;

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/profile/`, {
          headers: authHeaders(false),
        });
        if (res.ok) {
          const data = await res.json();
          setForm({
            full_name: data.full_name || "",
            bio: data.profile?.bio || "",
            contact: data.profile?.contact || "",
            skills: data.profile?.skills || [],
            profile_image: data.profile?.profile_image || null,
          });
          if (data.profile?.profile_image) {
            setPreview(
              data.profile.profile_image.startsWith("http")
                ? data.profile.profile_image
                : `${API_BASE}${data.profile.profile_image}`
            );
          }
        } else {
          console.warn("Failed to fetch profile:", res.status);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    const loadSkills = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/skills/`);
        if (res.ok) {
          const data = await res.json();
          setSkills(data.map((s) => ({ value: s.name, label: s.name })));
        }
      } catch (err) {
        console.error("Error fetching skills:", err);
      }
    };

    const loadCourses = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/courses/`);
        if (res.ok) {
          const data = await res.json();
          // show courses owned by this user (instructor) — handle possible shapes
          const my = data.filter(
            (c) =>
              (c.instructor_name && user && c.instructor_name === user.username) ||
              (c.instructor && user && c.instructor === user.id)
          );
          setCourses(my);
        } else {
          console.warn("Failed to load courses:", res.status);
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    const loadTimeslots = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/timeslots/`, {
          headers: authHeaders(false),
        });
        if (res.ok) {
          const data = await res.json();
          setTimeslots(data || []);
        } else {
          // not fatal: timeslots might not exist
          setTimeslots([]);
        }
      } catch (err) {
        console.error("Error fetching timeslots:", err);
        setTimeslots([]);
      }
    };

    loadProfile();
    loadSkills();
    loadCourses();
    loadTimeslots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user]);

  // ------------------- Profile update -------------------
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, profile_image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSkillChange = async (selectedOptions) => {
    if (!accessToken) {
      alert("Login required to add skills");
      return;
    }
    const newSkills = selectedOptions.map((s) => ({
      name: s.value.charAt(0).toUpperCase() + s.value.slice(1).toLowerCase(),
    }));

    // create_or_get skill on backend for any new skill
    for (const skill of newSkills) {
      try {
        const res = await fetch(`${API_BASE}/api/users/skills/add/`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({ name: skill.name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.name && !skills.some((s) => s.value === data.name)) {
            setSkills((prev) => [...prev, { value: data.name, label: data.name }]);
          }
        } else {
          // ignore; skill might already exist
        }
      } catch (err) {
        console.error("Error adding skill:", err);
      }
    }

    // dedupe and set
    const deduped = [
      ...new Map(newSkills.map((it) => [it.name.toLowerCase(), it])).values(),
    ];
    setForm({ ...form, skills: deduped });
  };

  const handleUpdate = async () => {
    if (!accessToken) {
      alert("Login required");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("bio", form.bio || "");
      formData.append("contact", form.contact || "");

      const formattedSkills = [
        ...new Set(
          form.skills.map((skill) =>
            typeof skill === "string"
              ? skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase()
              : skill.name.charAt(0).toUpperCase() + skill.name.slice(1).toLowerCase()
          )
        ),
      ];
      formData.append("skills", JSON.stringify(formattedSkills));

      if (form.profile_image instanceof File) {
        formData.append("profile_image", form.profile_image);
      }

      const res = await fetch(`${API_BASE}/api/users/profile/update/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` }, // DO NOT set content-type: browser will set boundary
        body: formData,
      });

      const data = await safeJson(res);

      if (res.ok) {
        alert("Profile updated successfully");
        setEditing(false);
        refreshProfile && refreshProfile();
      } else {
        console.error("Profile update failed", res.status, data);
        alert("Failed to update profile. See console for details.");
      }
    } catch (err) {
      console.error("Error updating profile", err);
      alert("Error updating profile. Check console.");
    }
  };

  // ------------------- Timeslot management (instructor) -------------------
  const fetchTimeslots = async () => {
    setTsLoading(true);
    try {
      if (!accessToken) return;
      const res = await fetch(`${API_BASE}/api/users/timeslots/`, {
        headers: authHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeslots(data || []);
      } else {
        setTimeslots([]);
      }
    } catch (err) {
      console.error("Error fetching timeslots:", err);
      setTimeslots([]);
    } finally {
      setTsLoading(false);
    }
  };

  const handleAddTimeslot = async (e) => {
    e.preventDefault();
    if (!tsStart) {
      alert("Provide a start time");
      return;
    }
    try {
      const body = { start_time: tsStart, end_time: tsEnd || null, note: tsNote || "" };
      const res = await fetch(`${API_BASE}/api/users/timeslots/create/`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (res.ok) {
        // append returned timeslot or reload
        if (data && data.id) setTimeslots((prev) => [...prev, data]);
        else await fetchTimeslots();
        setTsStart("");
        setTsEnd("");
        setTsNote("");
      } else {
        const msg = data?.error || data?.detail || `Failed to create timeslot (${res.status})`;
        alert(msg);
      }
    } catch (err) {
      console.error("Error creating timeslot:", err);
      alert("Could not create timeslot. See console.");
    }
  };

  const handleDeleteTimeslot = async (id) => {
    if (!window.confirm("Delete timeslot?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/timeslots/${id}/`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      if (res.ok || res.status === 204) {
        setTimeslots((prev) => prev.filter((t) => t.id !== id));
      } else {
        alert("Failed to delete timeslot");
      }
    } catch (err) {
      console.error("Delete timeslot error:", err);
      alert("Error deleting timeslot");
    }
  };

  // ------------------- Courses -------------------
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      alert("Title and description are required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/courses/create/`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ title, description, duration, price }),
      });

      const data = await safeJson(res);

      // Normal success
      if (res.ok) {
        // if API returns created object, append it; otherwise refetch courses
        if (data && data.id) {
          setCourses((prev) => [...prev, data]);
        } else {
          // re-fetch full courses list
          const cRes = await fetch(`${API_BASE}/api/courses/`);
          if (cRes.ok) {
            const all = await cRes.json();
            const my = all.filter(
              (c) =>
                (c.instructor_name && user && c.instructor_name === user.username) ||
                (c.instructor && user && c.instructor === user.id)
            );
            setCourses(my);
          }
        }
        alert("Course added successfully");
        setShowCourseModal(false);
        setTitle("");
        setDescription("");
        setDuration("");
        setPrice("");
        return;
      }

      // If we get here: res not ok. BUT backend might have still saved course (observed).
      // Try to detect whether the course exists now by re-fetching courses and matching by title + instructor.
      const reRes = await fetch(`${API_BASE}/api/courses/`);
      if (reRes.ok) {
        const all = await reRes.json();
        const found = all.find(
          (c) =>
            (c.title && c.title === title) &&
            ((c.instructor_name && user && c.instructor_name === user.username) ||
              (c.instructor && user && c.instructor === user.id))
        );
        if (found) {
          // Treat as success (backend saved the course despite returning error)
          setCourses((prev) => [...prev, found]);
          alert("Course added successfully (backend returned error but saved the course).");
          setShowCourseModal(false);
          setTitle("");
          setDescription("");
          setDuration("");
          setPrice("");
          return;
        }
      }

      // Otherwise show backend message (if any) or generic failure
      const msg = data?.error || data?.detail || `Failed to add course (${res.status})`;
      alert(msg);
      console.error("Course create failed", res.status, data);
    } catch (err) {
      console.error("Error adding course:", err);
      alert("Failed to add course. See console for details.");
    }
  };

  // ------------------- Enrollment (student) -------------------
  const openEnrollModal = (course) => {
    setEnrollingCourse(course);
    setEnrollModalOpen(true);
    // select first timeslot if available
    if (timeslots.length > 0) setSelectedTimeslotId(timeslots[0].id);
    else setSelectedTimeslotId(null);
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!enrollingCourse) return;
    setEnrolling(true);
    try {
      const payload = { timeslot_id: selectedTimeslotId };
      const res = await fetch(
        `${API_BASE}/api/courses/${enrollingCourse.id}/enroll/`,
        {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify(payload),
        }
      );
      const data = await safeJson(res);
      if (res.ok) {
        alert("Enrollment request sent successfully");
        setEnrollModalOpen(false);
        setEnrollingCourse(null);
      } else {
        // attempt to detect whether enrollment exists (edge cases)
        const msg = data?.error || data?.detail || `Failed to enroll (${res.status})`;
        alert(msg);
        console.error("Enroll failed", res.status, data);
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("Error sending enrollment. See console.");
    } finally {
      setEnrolling(false);
    }
  };

  // ------------------- Small UI helpers -------------------
  // used to make value format consistent for CreatableSelect value prop
  const formatFormSkillsForSelect = () =>
    (form.skills || []).map((s) => ({ value: s.name || s, label: s.name || s }));

  // ------------------- Render -------------------
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-3xl text-center">
        {/* header */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full border-4 border-indigo-500 overflow-hidden mb-4">
            <img
              src={
                preview
                  ? preview
                  : form.profile_image
                  ? form.profile_image.startsWith("http")
                    ? form.profile_image
                    : `${API_BASE}${form.profile_image}`
                  : "/default-avatar.png"
              }
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold mb-1 text-gray-900">
            {form.full_name || user?.username}
          </h2>
          <p className="text-gray-500 mb-4">@{user?.username}</p>
        </div>

        {/* view / edit */}
        {!editing ? (
          <div className="mt-2 text-left">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Bio:</strong> {form.bio || "Not provided"}
            </p>
            <p>
              <strong>Contact:</strong> {form.contact || "Not provided"}
            </p>
            <p>
              <strong>Skills:</strong>{" "}
              {form.skills && form.skills.length > 0
                ? form.skills.map((s) => s.name || s).join(", ")
                : "No skills added"}
            </p>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setEditing(true)}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShowCourseModal(true)}
                className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition"
              >
                ➕ Add Course
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4 text-left">
            <input
              type="text"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Your bio"
              className="w-full p-2 border rounded-lg"
            />
            <input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="Contact number"
              className="w-full p-2 border rounded-lg"
            />
            <CreatableSelect
              isMulti
              options={skills}
              value={formatFormSkillsForSelect()}
              onChange={handleSkillChange}
              placeholder="Select or add skills..."
              className="text-gray-900"
            />
            <input
              type="file"
              name="profile_image"
              onChange={handleImageChange}
              className="w-full border rounded-lg p-2"
            />
            <div className="flex justify-between gap-4">
              <button
                onClick={handleUpdate}
                className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="w-1/2 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* courses offered */}
        <div className="mt-8 text-left">
          <h3 className="text-lg font-semibold text-indigo-700 mb-3">Courses Offered</h3>
          {courses.length > 0 ? (
            courses.map((course) => (
              <div key={course.id} className="border p-3 rounded-lg mb-3 bg-gray-50 shadow-sm">
                <h4 className="font-bold text-gray-800">{course.title}</h4>
                <p className="text-gray-600">{course.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Duration: {course.duration} mins | ₹{course.price}
                </p>
                <div className="mt-3 flex gap-2">
  {user && (course.instructor_name === user.username || course.instructor === user.id) ? (
    <>
      {/* Instructor sees ONLY Manage button */}
      <button
        onClick={() => navigate(`/courses/${course.id}/manage`)}
        className="px-3 py-1 bg-gray-200 rounded"
      >
        Manage
      </button>
    </>
  ) : (
    <>
      {/* Students see ONLY Enroll/Schedule */}
      <button
        onClick={() => openEnrollModal(course)}
        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Enroll / Schedule
      </button>
    </>
  )}
</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No courses yet.</p>
          )}
        </div>

        {/* timeslots management */}
        <div className="mt-6 text-left">
          <h3 className="text-lg font-semibold mb-2">Your Timeslots (Instructor)</h3>

          <form onSubmit={handleAddTimeslot} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="block text-sm text-gray-700">Start</label>
              <input
                type="datetime-local"
                value={tsStart}
                onChange={(e) => setTsStart(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700">End (optional)</label>
              <input
                type="datetime-local"
                value={tsEnd}
                onChange={(e) => setTsEnd(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700">Note</label>
              <input
                type="text"
                value={tsNote}
                onChange={(e) => setTsNote(e.target.value)}
                placeholder="short note (e.g. Mon 5-6pm)"
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="col-span-full flex gap-2 mt-2">
              <button type="submit" disabled={tsLoading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                {tsLoading ? "Adding..." : "Add Timeslot"}
              </button>
              <button type="button" onClick={fetchTimeslots} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Refresh Timeslots
              </button>
            </div>
          </form>

          <div className="mt-4">
            {timeslots.length === 0 ? (
              <p className="text-gray-500 italic">No timeslots yet.</p>
            ) : (
              <ul className="space-y-2">
                {timeslots.map((t) => (
                  <li key={t.id} className="flex items-center justify-between bg-gray-50 border p-2 rounded">
                    <div className="text-left">
                      <div className="font-medium">
                        {t.start_time} {t.end_time ? `→ ${t.end_time}` : ""}
                      </div>
                      <div className="text-sm text-gray-600">{t.note}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`${t.start_time} ${t.note || ""}`);
                          alert("Timeslot copied");
                        }}
                        className="px-2 py-1 bg-blue-100 rounded"
                      >
                        Copy
                      </button>
                      <button onClick={() => handleDeleteTimeslot(t.id)} className="px-2 py-1 bg-red-100 rounded">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
  {/* Add Course Modal */}
        {showCourseModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4 text-indigo-700">Create a New Course</h2>
              <form onSubmit={handleAddCourse}>
                <input type="text" placeholder="Course Title" className="w-full border p-2 rounded mb-3" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <textarea placeholder="Description" className="w-full border p-2 rounded mb-3" value={description} onChange={(e) => setDescription(e.target.value)} />
                <input type="number" placeholder="Duration (mins)" className="w-full border p-2 rounded mb-3" value={duration} onChange={(e) => setDuration(e.target.value)} />
                <input type="number" placeholder="Price (₹)" className="w-full border p-2 rounded mb-3" value={price} onChange={(e) => setPrice(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enrollment modal */}
        {enrollModalOpen && enrollingCourse && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-2">Schedule Enrollment</h2>
              <p className="text-sm text-gray-700 mb-4">
                Select an available timeslot for <span className="font-medium">{enrollingCourse.title}</span>
              </p>

              <form onSubmit={handleEnroll}>
                <div className="mb-4">
                  {timeslots.length === 0 ? (
                    <p className="text-gray-500 italic">
                      No timeslots published by the instructor. You may still send a request without a timeslot.
                    </p>
                  ) : (
                    <select value={selectedTimeslotId || ""} onChange={(e) => setSelectedTimeslotId(Number(e.target.value))} className="w-full border p-2 rounded">
                      <option value="">-- choose a timeslot --</option>
                      {timeslots.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.start_time}
                          {t.end_time ? ` → ${t.end_time}` : ""} {t.note ? ` (${t.note})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setEnrollModalOpen(false); setEnrollingCourse(null); }} className="px-4 py-2 bg-gray-300 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg" disabled={enrolling}>
                    {enrolling ? "Enrolling..." : "Send Enrollment Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
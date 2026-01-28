import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const UserProfileView = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/users/public/${username}/`);
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        } else if (res.status === 404) {
          setError("User not found.");
        } else {
          setError("Failed to load user profile.");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username]);

  // Fetch user’s courses
  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/courses/by-user/${username}/`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    if (username) fetchUserCourses();
  }, [username]);

  // Enroll in course
  const handleEnroll = async (courseId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("You must be logged in to enroll.");
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/courses/${courseId}/enroll/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("Enrollment request sent successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to enroll.");
      }
    } catch (err) {
      console.error("Error enrolling:", err);
      alert("Something went wrong.");
    } finally {
      setEnrolling(false);
    }
  };

  // Message user
  const handleMessageUser = async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      alert("You must be logged in to send a message.");
      return;
    }

    const recipientUsername =
      userData.user?.username || userData.username || username;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat/start_conversation/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: recipientUsername }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || data.detail || "Failed to start conversation.");
        return;
      }

      navigate(`/chat?conversation=${data.id}`);
    } catch (err) {
      console.error("Conversation error:", err);
      alert("Something went wrong.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-600 text-lg">
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-700">
        <h1 className="text-2xl font-semibold mb-4">{error}</h1>
        <button
          onClick={() => navigate("/skills")}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Back to Skills
        </button>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-3xl w-full border border-gray-200">
        
        {/* Profile header unchanged */}
        <div className="flex flex-col items-center">
          <img
            src={
              userData.profile_image
                ? userData.profile_image
                : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover border-4 border-indigo-600 mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-800 capitalize">
            {userData.full_name || userData.username}
          </h2>
          <p className="text-gray-500">
            @{userData.user?.username || userData.username || username}
          </p>
        </div>

        {/* Details unchanged */}
        <div className="mt-6 space-y-3 text-gray-700">
          <p>
            <span className="font-semibold text-indigo-600">Email:</span>{" "}
            {userData.email || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-indigo-600">Bio:</span>{" "}
            {userData.bio || "No bio"}
          </p>
          <p>
            <span className="font-semibold text-indigo-600">Contact:</span>{" "}
            {userData.contact || "Not provided"}
          </p>

          <div className="mt-4">
            <h3 className="font-semibold text-indigo-600 mb-2">Skills:</h3>
            {userData.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {userData.skills.map((skill, index) => (
                  <span key={index} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No skills added.</p>
            )}
          </div>
        </div>

        {/* COURSES SECTION — UPDATED BLOCK */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-indigo-700 mb-3">Courses Offered</h3>

          {courses.length > 0 ? (
            courses.map((course) => (
              <div
                key={course.id}
                className="p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm"
              >
                <h4 className="text-lg font-semibold text-gray-800">{course.title}</h4>
                <p className="text-gray-600 mb-2">{course.description}</p>
                <p className="text-sm text-gray-500">
                  Duration: {course.duration} mins | ₹{course.price}
                </p>

                {/* ▶▶ OPTION A — SEPARATE BUTTONS */}
                <div className="flex gap-3 mt-4">
                  
                  {/* Enroll Button */}
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrolling}
                    className={`px-4 py-2 rounded-lg text-white transition ${
                      enrolling
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {enrolling ? "Enrolling..." : "Enroll"}
                  </button>

                  {/* Schedule Button */}
                  <button
                    onClick={() => navigate(`/courses/${course.id}/view-timeslots`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Schedule
                  </button>

                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No courses available.</p>
          )}
        </div>

        {/* Footer Buttons unchanged */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
          >
            Back
          </button>

          <button
            onClick={handleMessageUser}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            💬 Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
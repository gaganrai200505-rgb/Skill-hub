import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Added for navigation

const Skills = () => {
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const navigate = useNavigate(); // ✅ navigation hook

  // ✅ Fetch skills from backend
  const fetchSkills = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/skills/");
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
        setFilteredSkills(data);
      }
    } catch (err) {
      console.error("Error fetching skills:", err);
    }
  };

  // ✅ Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/categories/");
      if (res.ok) {
        const data = await res.json();
        setCategories(["All", ...data.map((c) => c.name)]);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchCategories();
  }, []);

  // ✅ Filter skills by category and search
  useEffect(() => {
    let result = skills;

    if (selectedCategory !== "All") {
      result = result.filter((s) => s.category === selectedCategory);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(query));
    }

    setFilteredSkills(result);
  }, [search, selectedCategory, skills]);

  // ✅ Handle Skill Click (modal + users)
  const handleSkillClick = async (skill) => {
  setSelectedSkill({ ...skill, loading: true, users: [] });

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/users/skills/${skill.id}/users/`);
    if (res.ok) {
      const data = await res.json();

      // 🔥 FIX: Normalize backend response
      let users = [];

      if (Array.isArray(data)) {
        // backend returned: [ {...}, {...} ]
        users = data;
      } else if (data.users) {
        // backend returned: { users: [ {...} ] }
        users = data.users;
      }

      setSelectedSkill({
        ...skill,
        users: users,
        loading: false,
      });
    } else {
      console.error("Failed to fetch users for skill:", res.status);
      setSelectedSkill({ ...skill, users: [], loading: false });
    }
  } catch (err) {
    console.error("Error fetching users for skill:", err);
    setSelectedSkill({ ...skill, users: [], loading: false });
  }
};
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-8 text-indigo-700">
        Browse Skills
      </h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-center mb-10">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full md:w-1/4 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map((cat, index) => (
            <option key={index} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search for skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* ✅ Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => handleSkillClick(skill)}
              className="cursor-pointer bg-white shadow-md hover:shadow-xl transition-all rounded-xl p-6 border border-gray-100"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {skill.name}
              </h2>
              <p className="text-sm text-gray-500 mb-1">
                Category:{" "}
                <span className="font-medium text-indigo-600">
                  {skill.category || "N/A"}
                </span>
              </p>

              {/* ✅ FIXED DESCRIPTION DISPLAY */}
              {skill.description && skill.description.trim() !== "" ? (
                <p className="text-gray-700 line-clamp-3">
                  {skill.description}
                </p>
              ) : (
                <p className="text-gray-400 italic">
                  No description available
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-600 text-center col-span-full">
            No skills found.
          </p>
        )}
      </div>

      {/* ✅ Skill Details Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => setSelectedSkill(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>

            {/* Skill Details */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2 capitalize">
              {selectedSkill.name}
            </h2>
            <p className="text-sm text-indigo-600 mb-4">
              Category: {selectedSkill.category || "N/A"}
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              {selectedSkill.description || "No description provided."}
            </p>

            {/* Users Who Know This Skill */}
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Users who know this skill:
            </h3>

            {/* ✅ Loading / Empty / Users */}
            {selectedSkill.loading ? (
              <p className="text-gray-500 italic">Loading users...</p>
            ) : selectedSkill.users?.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {selectedSkill.users.map((user, index) => (
                  <li
                    key={index}
                    className="py-3 flex items-center gap-4 hover:bg-gray-50 transition-all rounded-lg px-2"
                  >
                    {/* User Image */}
                    <img
                      src={
                        user.profile_image
                          ? user.profile_image
                          : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                      }
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-300"
                    />

                    {/* User Info */}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {user.full_name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>

                    {/* ✅ View Profile Button */}
                    <button
                      onClick={() => navigate(`/users/${user.username}`)}
                      className="text-indigo-600 text-sm font-medium hover:underline"
                    >
                      View Profile
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No users found for this skill.</p>
            )}

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedSkill(null)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Skills;
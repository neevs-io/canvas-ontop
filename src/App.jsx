// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Options from './options';

// ===== Helper Functions =====

// Return a "clean" course name
const getCleanCourseName = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  let start = 0;
  if (parts.length >= 2 && /^[A-Z]+\\d+$/i.test(parts[0]) && /^\\d+$/.test(parts[1])) {
    start = 2;
  }
  let end = parts.length;
  for (let i = start; i < parts.length; i++) {
    if (/^(Spring|Summer|Fall)$/i.test(parts[i]) && i + 1 < parts.length && /^\\d{4}$/.test(parts[i + 1])) {
      end = i;
      break;
    }
  }
  return parts.slice(start, end).join(' ');
};

// Generate the weekly focus prompt for the AI
const generateWeeklyFocusPrompt = (courses, weekStart, weekEnd) => {
  const courseSummaries = courses
    .map((course) => {
      let summary = `${getCleanCourseName(course.name)}: `;
      const items = [];
      if (course.assignments && course.assignments.length > 0) {
        items.push(
          ...course.assignments.map(
            (a) => `\"${a.name}\" due ${new Date(a.due_at).toLocaleDateString()}`
          )
        );
      }
      if (course.discussions && course.discussions.length > 0) {
        items.push(
          ...course.discussions.map((d) => {
            const dueStr =
              d.due_at || (d.assignment && d.assignment.due_at) || d.lock_at;
            return `\"${d.title}\" due ${dueStr ? new Date(dueStr).toLocaleDateString() : 'no deadline'}`;
          })
        );
      }
      summary += items.join(', ');
      return summary;
    })
    .join('; ');

  return `
You are a helpful academic assistant. Based on the following weekly summary (${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}):
${courseSummaries}
Please provide a short, one- or two-sentence encouraging message that highlights the key deadlines.
  `;
};

// Filter items (assignments) by the fixed week boundaries
const filterByWeek = (items, weekStart, weekEnd) => {
  return items.filter((item) => {
    if (!item.due_at) return false;
    const dueDate = new Date(item.due_at);
    return dueDate >= weekStart && dueDate <= weekEnd;
  });
};

// Filter discussions by the fixed week boundaries
const filterDiscussionsByWeek = (discussions, weekStart, weekEnd) => {
  return discussions.filter((item) => {
    const dueDateStr =
      item.due_at || (item.assignment && item.assignment.due_at) || item.lock_at;
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr);
    return dueDate >= weekStart && dueDate <= weekEnd;
  });
};

// ===== Helper: Fixed Week Boundaries =====
// Returns a new Date set to the Monday of the week for the given date.
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  // If Sunday (0), we want to treat it as the last day of the previous week.
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(d.setDate(diff));
}

// ===== DashboardView Component =====
const DashboardView = ({ onSelectItem, onConfigure, doneItems, onMarkAsDone }) => {
  const [courses, setCourses] = useState([]);
  const [assistantMessage, setAssistantMessage] = useState('Loading weekly focus...');
  // Use a fixed week start based on Monday
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));

  // Set weekEnd to the next Monday (7 days later) with time set to 23:59:59.999
  const weekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [currentWeekStart]);

  const [sidePanelLoaded, setSidePanelLoaded] = useState(false);
  const [initialWeekStart, setInitialWeekStart] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);

  // Check configuration
  useEffect(() => {
    chrome.storage.sync.get(['canvasApiUrl', 'canvasApiToken', 'openaiApiKey'], (items) => {
      if (!items.canvasApiUrl || !items.canvasApiToken || !items.openaiApiKey) {
        setIsConfigured(false);
      } else {
        setIsConfigured(true);
      }
    });
  }, []);

  useEffect(() => {
    setSidePanelLoaded(true);
    if (!initialWeekStart) {
      setInitialWeekStart(new Date(currentWeekStart));
    }
  }, [currentWeekStart, initialWeekStart]);

  // Fetch courses (and assignments/discussions) from Canvas
  useEffect(() => {
    const fetchCourses = async () => {
      const config = await new Promise((resolve) =>
        chrome.storage.sync.get(['canvasApiUrl', 'canvasApiToken'], resolve)
      );
      const { canvasApiUrl, canvasApiToken } = config;
      if (!canvasApiUrl || !canvasApiToken) {
        console.error('Canvas configuration is missing.');
        return;
      }

      try {
        const coursesResponse = await fetch(
          `${canvasApiUrl}/api/v1/courses?enrollment_state=active&completed=false&include[]=enrollments&per_page=100`,
          { headers: { Authorization: `Bearer ${canvasApiToken}` } }
        );
        let coursesData = await coursesResponse.json();

        coursesData = await Promise.all(
          coursesData.map(async (course) => {
            try {
              const [assignmentsResponse, discussionsResponse] = await Promise.all([
                fetch(`${canvasApiUrl}/api/v1/courses/${course.id}/assignments?per_page=100`, {
                  headers: { Authorization: `Bearer ${canvasApiToken}` },
                }),
                fetch(`${canvasApiUrl}/api/v1/courses/${course.id}/discussion_topics?per_page=100`, {
                  headers: { Authorization: `Bearer ${canvasApiToken}` },
                }),
              ]);
              const assignments = await assignmentsResponse.json();
              const discussions = await discussionsResponse.json();
              return { ...course, assignments, discussions };
            } catch (err) {
              console.error(`Error fetching details for course ${course.id}:`, err);
              return course;
            }
          })
        );

        setCourses(coursesData);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, []);

  // Fetch AI weekly focus message once courses are loaded
  useEffect(() => {
    const fetchAiMessage = async () => {
      if (!initialWeekStart) return;
      const initialWeekEnd = new Date(initialWeekStart);
      initialWeekEnd.setDate(initialWeekEnd.getDate() + 7);
      initialWeekEnd.setHours(23, 59, 59, 999);

      const filteredCourses = courses
        .map((course) => {
          const assignmentsDue = course.assignments
            ? filterByWeek(course.assignments, initialWeekStart, initialWeekEnd)
            : [];
          const discussionsDue = course.discussions
            ? filterDiscussionsByWeek(course.discussions, initialWeekStart, initialWeekEnd)
            : [];
          return { ...course, assignments: assignmentsDue, discussions: discussionsDue };
        })
        .filter((course) => course.assignments.length > 0 || course.discussions.length > 0);

      if (filteredCourses.length === 0) {
        setAssistantMessage('You have no upcoming deadlines this week. Enjoy your break!');
        return;
      }

      const prompt = generateWeeklyFocusPrompt(filteredCourses, initialWeekStart, initialWeekEnd);
      const config = await new Promise((resolve) =>
        chrome.storage.sync.get(['openaiApiKey'], resolve)
      );
      const { openaiApiKey } = config;
      if (!openaiApiKey) {
        console.error('OpenAI API key is missing.');
        setAssistantMessage('OpenAI API key is not configured.');
        return;
      }

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          setAssistantMessage(data.choices[0].message.content);
        } else {
          setAssistantMessage('No message returned from AI.');
        }
      } catch (error) {
        console.error('Error fetching AI response:', error);
        setAssistantMessage('Error fetching AI response.');
      }
    };

    if (sidePanelLoaded && courses.length > 0 && initialWeekStart) {
      fetchAiMessage();
    }
  }, [courses, sidePanelLoaded, initialWeekStart]);

  // Navigation between weeks (increments of 7 days)
  const navigateWeek = (direction) => {
    setCurrentWeekStart((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + direction * 7);
      return newDate;
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Compute overall undone counts across all courses for the current week.
  const overallCounts = courses.reduce(
    (acc, course) => {
      const assignmentsDue = course.assignments ? filterByWeek(course.assignments, currentWeekStart, weekEnd) : [];
      const discussionsDue = course.discussions ? filterDiscussionsByWeek(course.discussions, currentWeekStart, weekEnd) : [];
      const undoneAssignments = assignmentsDue.filter(
        (assignment) =>
          !doneItems.assignments.some((done) => done.courseId === course.id && done.itemId === assignment.id)
      );
      const undoneDiscussions = discussionsDue.filter(
        (discussion) =>
          !doneItems.discussions.some((done) => done.courseId === course.id && done.itemId === discussion.id)
      );
      acc.assignments += undoneAssignments.length;
      acc.discussions += undoneDiscussions.length;
      return acc;
    },
    { assignments: 0, discussions: 0 }
  );

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md text-center mb-4">
          Please configure the extension by clicking on the settings button.
        </div>
      )}
      <div className="flex items-center justify-between bg-base-bg p-3 rounded-xl shadow-sm border border-border-light">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
        >
          <ChevronLeft size={20} className="text-text-dark" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-text-dark">Canvas On Top</h2>
          <p className="text-sm text-gray-600">AI-augmented course management</p>
          <p className="text-sm text-gray-600 mt-1">
            {formatDate(currentWeekStart.toISOString())} - {formatDate(weekEnd.toISOString())}
          </p>
        </div>

        <div className="flex flex-col items-end">
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 mb-1"
          >
            <ChevronRight size={20} className="text-text-dark" />
          </button>
          <button
            onClick={onConfigure}
            className="flex items-center gap-1 px-3 py-1 bg-neu-red hover:bg-red-700 text-white rounded-full text-sm transition-all duration-200"
          >
            <Settings size={16} className="text-white" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Weekly Focus Section */}
      <div className="bg-gradient-to-r from-neu-red to-canvas-teal rounded-xl p-4 shadow-lg">
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0 mt-1">
            <div className="bg-white/20 rounded-lg p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-white text-lg">Weekly Focus</h3>
            <p
              className={`text-white/90 text-sm leading-snug ${
                assistantMessage === 'Loading weekly focus...' ? 'animate-pulse' : ''
              }`}
            >
              {assistantMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Due Count Section */}
      <div className="flex justify-around space-x-4 bg-base-bg rounded-xl p-4 shadow-sm border border-border-light">
        <div className="flex flex-col items-center p-4 rounded-xl">
          <BookOpen className="h-6 w-6 text-neu-red" />
          <h4 className="text-lg font-bold text-text-dark mt-1">{overallCounts.assignments}</h4>
          <p className="text-sm text-gray-600">Assignments Due</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl">
          <MessageCircle className="h-6 w-6 text-canvas-teal" />
          <h4 className="text-lg font-bold text-text-dark mt-1">{overallCounts.discussions}</h4>
          <p className="text-sm text-gray-600">Discussions Due</p>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-5">
        {courses.map((course) => {
          // Get assignments/discussions due this week for each course
          const assignmentsDue = course.assignments
            ? filterByWeek(course.assignments, currentWeekStart, weekEnd)
            : [];
          const discussionsDue = course.discussions
            ? filterDiscussionsByWeek(course.discussions, currentWeekStart, weekEnd)
            : [];

          // Calculate undone counts for the course (for the header count)
          const undoneAssignmentsCount = assignmentsDue.filter(
            (assignment) =>
              !doneItems.assignments.some(
                (done) => done.courseId === course.id && done.itemId === assignment.id
              )
          ).length;
          const undoneDiscussionsCount = discussionsDue.filter(
            (discussion) =>
              !doneItems.discussions.some(
                (done) => done.courseId === course.id && done.itemId === discussion.id
              )
          ).length;
          const totalDue = undoneAssignmentsCount + undoneDiscussionsCount;

          // Skip course if there are no items in the current week
          if (assignmentsDue.length + discussionsDue.length === 0) return null;

          return (
            <div key={course.id} className="bg-base-bg rounded-xl shadow-sm border border-border-light w-full max-w-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border-light bg-gray-50 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-text-dark">{getCleanCourseName(course.name)}</h3>
                </div>
                <div className={`flex items-center space-x-2 text-sm px-3 py-1 ${totalDue >= 3 ? "bg-red-50 text-neu-red" : totalDue === 2 ? "bg-orange-50 text-orange-600" : "bg-teal-50 text-canvas-teal"} rounded-full`}>
                  <Calendar size={16} />
                  <span>{totalDue} due</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Render assignments */}
                {assignmentsDue.map((assignment) => {
                  const isDone = doneItems.assignments.some(
                    (done) => done.courseId === course.id && done.itemId === assignment.id
                  );
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => onSelectItem('assignment', course, assignment)}
                    >
                      <div className="space-y-0.5">
                        <span className={`text-sm font-medium ${isDone ? 'line-through opacity-50' : 'text-text-dark'}`}>
                          {assignment.name}
                        </span>
                        <div className="text-xs text-gray-500">Due {formatDate(assignment.due_at)}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsDone('assignment', course, assignment);
                          }}
                          className={`px-2 py-1 rounded-full text-sm ${
                            isDone ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isDone ? 'Done ✓' : 'Mark Done'}
                        </button>
                        <div className="px-2 py-1 bg-white rounded-md text-sm font-medium text-neu-red shadow-sm">
                          {assignment.points_possible} pts
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Render discussions */}
                {discussionsDue.map((discussion) => {
                  const isDone = doneItems.discussions.some(
                    (done) => done.courseId === course.id && done.itemId === discussion.id
                  );
                  return (
                    <div
                      key={discussion.id}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => onSelectItem('discussion', course, discussion)}
                    >
                      <div className="space-y-0.5">
                        <span className={`text-sm font-medium ${isDone ? 'line-through opacity-50' : 'text-text-dark'}`}>
                          {discussion.title}
                        </span>
                        <div className="text-xs text-gray-500">
                          Due{' '}
                          {formatDate(
                            discussion.due_at ||
                              (discussion.assignment && discussion.assignment.due_at) ||
                              discussion.lock_at
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsDone('discussion', course, discussion);
                          }}
                          className={`px-2 py-1 rounded-full text-sm ${
                            isDone ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isDone ? 'Done ✓' : 'Mark Done'}
                        </button>
                        <div className="flex items-center space-x-2">
                          <div className="px-2 py-1 bg-white rounded-md text-sm font-medium text-canvas-teal shadow-sm">
                            {discussion.replies_count || 0} replies
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== DetailView Component =====
const DetailView = ({ selectedItem, onBack }) => {
  const [aiTips, setAiTips] = useState('Loading AI tips...');
  const { type, course, item } = selectedItem;
  const isAssignment = type === 'assignment';

  // Extract and clean the description:
  const itemDescription = (isAssignment ? item.description : item.message) || '';
  const cleanDescription = itemDescription
    .replace(/<[^>]+>/g, '')
    .replace(/ /g, ' ')
    .trim();

  const detailList = [
    { label: 'Course', value: getCleanCourseName(course.name) },
    { label: 'Title', value: isAssignment ? item.name : item.title },
  ];
  if (item.due_at) {
    detailList.push({ label: 'Due Date', value: new Date(item.due_at).toLocaleDateString() });
  }
  if (isAssignment && item.points_possible) {
    detailList.push({ label: 'Points', value: item.points_possible });
  }

  const aiPrompt = `Details:\n${detailList.map((d) => `${d.label}: ${d.value}`).join('\\n')}\nBased on the details above, please provide a bullet point list of 3-5 concise, actionable tips for a student to effectively approach this ${isAssignment ? 'assignment' : 'discussion'}.\nEach tip should be a single sentence starting with a dash (-). If there is insufficient content, feel free to provide fewer items.`;

  useEffect(() => {
    chrome.storage.sync.get(['openaiApiKey'], (config) => {
      const { openaiApiKey } = config;
      if (!openaiApiKey) {
        setAiTips('OpenAI API key is not configured.');
        return;
      }
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: aiPrompt }],
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.choices && data.choices[0] && data.choices[0].message) {
            setAiTips(data.choices[0].message.content);
          } else {
            setAiTips('No AI tips available.');
          }
        })
        .catch((error) => {
          console.error('Error fetching AI tips:', error);
          setAiTips('Error fetching AI tips.');
        });
    });
  }, [aiPrompt, isAssignment]);

  return (
    <div className="p-4 space-y-6">
      <button
        onClick={onBack}
        className="mb-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-text-dark rounded-full text-sm transition-all duration-200"
      >
        Back
      </button>
      <div className="bg-base-bg rounded-xl p-6 shadow-sm border border-border-light">
        <h2 className="text-2xl font-semibold text-text-dark mb-4">
          {isAssignment ? 'Assignment Details' : 'Discussion Details'}
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {detailList.map((detail, index) => (
            <div key={index} className="flex">
              <span className="font-medium text-text-dark w-24">{detail.label}:</span>
              <span className="text-text-dark">{detail.value}</span>
            </div>
          ))}
        </div>
        {cleanDescription && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-border-light">
            <h3 className="text-sm font-semibold text-text-dark mb-2">Description</h3>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{cleanDescription}</p>
          </div>
        )}
      </div>
      <div className="bg-gradient-to-r from-neu-red to-canvas-teal rounded-xl p-6 shadow-lg">
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0 mt-1">
            <div className="bg-white/20 rounded-lg p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-white text-lg">AI Tips</h3>
            <ReactMarkdown
              className="text-white text-sm space-y-2 react-markdown"
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="pl-2" {...props} />,
              }}
            >
              {aiTips}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Main App Component =====
const App = () => {
  const [view, setView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const [doneItems, setDoneItems] = useState({
    assignments: [],
    discussions: [],
  });

  // Load saved doneItems when component mounts
  useEffect(() => {
    chrome.storage.local.get(['doneItems'], (result) => {
      if (result.doneItems) {
        setDoneItems(result.doneItems);
      }
    });
  }, []);

  // Callback when an assignment or discussion is clicked.
  const handleSelectItem = (type, course, item) => {
    chrome.storage.sync.get(['canvasApiUrl'], (config) => {
      const { canvasApiUrl } = config;
      if (!canvasApiUrl) {
        console.error('Canvas API URL is not configured.');
        return;
      }
      let url = '';
      if (type === 'assignment') {
        url = `${canvasApiUrl}/courses/${course.id}/assignments/${item.id}`;
      } else if (type === 'discussion') {
        url = `${canvasApiUrl}/courses/${course.id}/discussion_topics/${item.id}`;
      }
      chrome.runtime.sendMessage({ action: 'openLink', url }, (response) => {
        console.log(`${type} openLink response:`, response);
      });
    });
    setSelectedItem({ type, course, item });
    setView('detail');
  };

  // Toggle (mark/unmark) an item as done.
  const markItemAsDone = (type, course, item) => {
    setDoneItems((prev) => {
      const updated = { ...prev };
      const collection = type === 'assignment' ? 'assignments' : 'discussions';
      const existingIndex = updated[collection].findIndex(
        (done) => done.courseId === course.id && done.itemId === item.id
      );
      if (existingIndex >= 0) {
        // Remove the item if already marked as done
        updated[collection] = updated[collection].filter((_, idx) => idx !== existingIndex);
      } else {
        // Otherwise, mark it as done
        updated[collection] = [...updated[collection], { courseId: course.id, itemId: item.id }];
      }
      chrome.storage.local.set({ doneItems: updated });
      return updated;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="transition-all duration-200">
        {view === 'dashboard' && (
          <DashboardView
            onSelectItem={handleSelectItem}
            onConfigure={() => setView('options')}
            doneItems={doneItems}
            onMarkAsDone={markItemAsDone}
          />
        )}
        {view === 'detail' && selectedItem && (
          <DetailView selectedItem={selectedItem} onBack={() => setView('dashboard')} />
        )}
        {view === 'options' && (
          <div>
            <button
              onClick={() => setView('dashboard')}
              className="mb-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-text-dark rounded-full text-sm transition-all duration-200"
            >
              Back
            </button>
            <Options />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
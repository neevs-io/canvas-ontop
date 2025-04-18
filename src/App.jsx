import './tailwind.css';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
  Flag,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Options from './options';

// Date helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'No deadline';
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'No deadline' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'No deadline';
  }
};

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const getCleanCourseName = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  let start = 0;
  if (parts.length >= 2 && /^[A-Z]+\d+$/i.test(parts[0]) && /^\d+$/.test(parts[1])) {
    start = 2;
  }
  let end = parts.length;
  for (let i = start; i < parts.length; i++) {
    if (/^(Spring|Summer|Fall)$/i.test(parts[i]) && i + 1 < parts.length && /^\d{4}$/.test(parts[i + 1])) {
      end = i;
      break;
    }
  }
  return parts.slice(start, end).join(' ');
};

const calculatePriorityScore = (item) => {
  if (!isValidDate(item.due_at)) return 0;
  
  const now = new Date();
  const dueDate = new Date(item.due_at);
  const timeDiff = dueDate - now;
  
  if (timeDiff < 0) return 100; // Past due
  
  const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
  let score = 0;
  
  // Time-based priority
  if (daysUntilDue <= 1) score += 50;
  else if (daysUntilDue <= 3) score += 40;
  else if (daysUntilDue <= 7) score += 30;
  
  // Points-based priority
  const points = item.points_possible || 0;
  if (points > 100) score += 30;
  else if (points > 50) score += 20;
  
  return Math.min(100, score);
};

const DashboardView = ({ onSelectItem, onConfigure, doneItems, onMarkAsDone }) => {
  const [courses, setCourses] = useState([]);
  const [assistantMessage, setAssistantMessage] = useState('Loading weekly focus...');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  });
  const [isConfigured, setIsConfigured] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null); // 'urgent', 'assignments', 'discussions', or null

  const weekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [currentWeekStart]);

  useEffect(() => {
    chrome.storage.sync.get(['canvasApiUrl', 'canvasApiToken', 'openaiApiKey'], (items) => {
      setIsConfigured(!!(items.canvasApiUrl && items.canvasApiToken && items.openaiApiKey));
    });
  }, []);

  useEffect(() => {
    const fetchCourses = async (retryCount = 0) => {
      const config = await new Promise((resolve) =>
        chrome.storage.sync.get(['canvasApiUrl', 'canvasApiToken'], resolve)
      );
      
      if (!config.canvasApiUrl || !config.canvasApiToken) {
        console.error('Canvas configuration is missing.');
        return;
      }

      try {
        const fetchWithTimeout = async (url, options, timeout = 30000) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          try {
            const response = await fetch(url, { 
              ...options, 
              signal: controller.signal 
            });
            clearTimeout(id);
            
            // First check if response is JSON
            const text = await response.text();
            try {
              return JSON.parse(text);
            } catch (e) {
              console.error('Failed to parse JSON:', text);
              throw new Error('Invalid JSON response');
            }
          } catch (error) {
            clearTimeout(id);
            throw error;
          }
        };

        // Fetch courses
        const coursesData = await fetchWithTimeout(
          `${config.canvasApiUrl}/api/v1/courses?enrollment_state=active&completed=false&include[]=enrollments&per_page=100`,
          { headers: { Authorization: `Bearer ${config.canvasApiToken}` } }
        );

        if (!Array.isArray(coursesData)) {
          throw new Error('Invalid courses data received');
        }

        console.log(`Loaded ${coursesData.length} courses`);

        // Fetch assignments and discussions for each course with error handling
        const loadedCourses = await Promise.all(
          coursesData.map(async (course) => {
            try {
              const [assignments, discussions] = await Promise.all([
                fetchWithTimeout(
                  `${config.canvasApiUrl}/api/v1/courses/${course.id}/assignments?per_page=100`,
                  { headers: { Authorization: `Bearer ${config.canvasApiToken}` } }
                ).catch(() => []), // Return empty array if fails
                
                fetchWithTimeout(
                  `${config.canvasUrl}/api/v1/courses/${course.id}/discussion_topics?per_page=100&include[]=assignment`,
                  { headers: { Authorization: `Bearer ${config.canvasApiToken}` } }
                ).catch(() => []) // Return empty array if fails
              ]);

              // Process discussions to include assignment due dates
              const processedDiscussions = Array.isArray(discussions) 
                ? discussions.map(discussion => ({
                    ...discussion,
                    due_at: discussion.assignment?.due_at || discussion.due_at,
                    points_possible: discussion.assignment?.points_possible
                  }))
                : [];

              return {
                ...course,
                assignments: Array.isArray(assignments) ? assignments : [],
                discussions: processedDiscussions
              };
            } catch (error) {
              console.error(`Error fetching details for course ${course.id}:`, error);
              return {
                ...course,
                assignments: [],
                discussions: [],
                error: error.message
              };
            }
          })
        );

        setCourses(loadedCourses.filter(course => 
          course.assignments.length > 0 || 
          course.discussions.length > 0
        ));
      } catch (error) {
        console.error('Error fetching courses:', error);
        
        if (retryCount < 3) {
          console.log(`Retrying (${retryCount + 1}/3)...`);
          setTimeout(() => fetchCourses(retryCount + 1), 2000 * (retryCount + 1));
        } else {
          setAssistantMessage('Failed to load courses. Please check your API settings.');
        }
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchAiMessage = async () => {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weekEnd.setHours(23, 59, 59, 999);

      const filteredCourses = courses
        .map((course) => ({
          ...course,
          assignments: course.assignments ? filterByWeek(course.assignments, currentWeekStart, weekEnd) : [],
          discussions: course.discussions ? filterDiscussionsByWeek(course.discussions, currentWeekStart, weekEnd) : []
        }))
        .filter((course) => course.assignments.length > 0 || course.discussions.length > 0);

      if (filteredCourses.length === 0) {
        setAssistantMessage('No upcoming deadlines this week. Enjoy your break!');
        return;
      }

      const prompt = `Upcoming deadlines (${currentWeekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}): ${
        filteredCourses.map(course => 
          `${getCleanCourseName(course.name)}: ${
            [...course.assignments, ...course.discussions]
              .map(item => `"${item.name || item.title}" due ${formatDate(item.due_at)}`)
              .join(', ')
          }`
        ).join('; ')
      }. Provide a short, encouraging message.`;

      const config = await new Promise((resolve) =>
        chrome.storage.sync.get(['openaiApiKey'], resolve)
      );
      
      if (!config.openaiApiKey) {
        setAssistantMessage('Configure OpenAI API key for personalized tips');
        return;
      }

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await response.json();
        setAssistantMessage(
          data.choices?.[0]?.message?.content || 'AI tips unavailable'
        );
      } catch (error) {
        console.error('Error fetching AI response:', error);
        setAssistantMessage('Error loading AI tips');
      }
    };

    if (courses.length > 0) fetchAiMessage();
  }, [courses, currentWeekStart]);

  const filterByWeek = (items, weekStart, weekEnd) => {
    return items.filter((item) => {
      if (!isValidDate(item.due_at)) return false;
      const dueDate = new Date(item.due_at);
      return dueDate >= weekStart && dueDate <= weekEnd;
    });
  };

  const filterDiscussionsByWeek = (discussions, weekStart, weekEnd) => {
    return discussions.filter((item) => {
      // Use assignment due date if available, fallback to discussion due date
      const dueDateStr = item.due_at || (item.assignment && item.assignment.due_at) || item.lock_at;
      if (!isValidDate(dueDateStr)) return false;
      const dueDate = new Date(dueDateStr);
      return dueDate >= weekStart && dueDate <= weekEnd;
    });
  };

  const navigateWeek = (direction) => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction * 7);
      return newDate;
    });
  };

  const overallCounts = courses.reduce(
    (acc, course) => {
      const assignmentsDue = course.assignments ? filterByWeek(course.assignments, currentWeekStart, weekEnd) : [];
      const discussionsDue = course.discussions ? filterDiscussionsByWeek(course.discussions, currentWeekStart, weekEnd) : [];
      
      const undoneAssignments = assignmentsDue.filter(a => 
        !doneItems.assignments.some(d => d.courseId === course.id && d.itemId === a.id)
      );
      
      const undoneDiscussions = discussionsDue.filter(d => 
        !doneItems.discussions.some(done => done.courseId === course.id && done.itemId === d.id)
      );
      
      // Calculate high priority items that are not done
      const highPriority = [...undoneAssignments, ...undoneDiscussions]
        .filter(i => calculatePriorityScore(i) >= 70).length;
      
      return {
        assignments: acc.assignments + undoneAssignments.length,
        discussions: acc.discussions + undoneDiscussions.length,
        highPriority: acc.highPriority + highPriority
      };
    },
    { assignments: 0, discussions: 0, highPriority: 0 }
  );

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md text-center">
          Please configure API keys in settings
        </div>
      )}

      {/* Header with centered title and right-aligned settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 relative">
          {/* Centered title with settings button on same level */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold">Canvas On Top</h2>
              <p className="text-sm text-gray-600">AI-augmented course management</p>
            </div>
            
            {/* Settings button positioned absolutely to right */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <button
                onClick={onConfigure}
                className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-all"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
          
          {/* Date navigation below */}
          <div className="flex items-center justify-center space-x-4 mt-3">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-700">
              {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
            </span>
            <button
              onClick={() => navigateWeek(1)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekly Focus section remains unchanged */}
        <div className="bg-gradient-to-r from-red-600 to-teal-500 p-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 to-teal-500/30"></div>
          <div className="relative z-10 flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Weekly Focus</h3>
              <p className="text-white/90 text-sm">
                {assistantMessage}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Overview */}
      <div className="grid grid-cols-3 gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div 
          className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
            activeFilter === 'urgent' ? 'bg-red-400 text-white' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'urgent' ? null : 'urgent')}
        >
          <Flag className={`h-6 w-6 ${activeFilter === 'urgent' ? 'text-white' : 'text-red-600'}`} />
          <span className="font-bold mt-1">{overallCounts.highPriority}</span>
          <span className={`text-sm ${activeFilter === 'urgent' ? 'text-white' : 'text-gray-600'}`}>Urgent</span>
        </div>
        <div 
          className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
            activeFilter === 'assignments' ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'assignments' ? null : 'assignments')}
        >
          <BookOpen className={`h-6 w-6 ${activeFilter === 'assignments' ? 'text-white' : 'text-blue-600'}`} />
          <span className="font-bold mt-1">{overallCounts.assignments}</span>
          <span className={`text-sm ${activeFilter === 'assignments' ? 'text-white' : 'text-gray-600'}`}>Assignments</span>
        </div>
        <div 
          className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
            activeFilter === 'discussions' ? 'bg-teal-400 text-white' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'discussions' ? null : 'discussions')}
        >
          <MessageCircle className={`h-6 w-6 ${activeFilter === 'discussions' ? 'text-white' : 'text-teal-600'}`} />
          <span className="font-bold mt-1">{overallCounts.discussions}</span>
          <span className={`text-sm ${activeFilter === 'discussions' ? 'text-white' : 'text-gray-600'}`}>Discussions</span>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-5">
        {courses.map((course) => {
          const assignmentsDue = course.assignments
            ? filterByWeek(course.assignments, currentWeekStart, weekEnd)
            : [];
          const discussionsDue = course.discussions
            ? filterDiscussionsByWeek(course.discussions, currentWeekStart, weekEnd)
            : [];

          // Add priority scores and sort
          const allItems = [
            ...assignmentsDue.map(a => ({ ...a, type: 'assignment' })),
            ...discussionsDue.map(d => ({ ...d, type: 'discussion' }))
          ]
            .map(item => ({
              ...item,
              priorityScore: calculatePriorityScore(item)
            }))
            .sort((a, b) => b.priorityScore - a.priorityScore);
            
          // Apply filters
          let prioritizedItems = [...allItems];
          
          // First filter by active filter category
          if (activeFilter === 'urgent') {
            prioritizedItems = allItems.filter(item => item.priorityScore >= 70);
          } else if (activeFilter === 'assignments') {
            prioritizedItems = allItems.filter(item => item.type === 'assignment');
          } else if (activeFilter === 'discussions') {
            prioritizedItems = allItems.filter(item => item.type === 'discussion');
          }
          
          // Then filter out completed items if any filter is active
          if (activeFilter) {
            prioritizedItems = prioritizedItems.filter(item => 
              !doneItems[`${item.type}s`].some(
                done => done.courseId === course.id && done.itemId === item.id
              )
            );
          }

          // Calculate counts after filtering
          const undoneCount = allItems.filter(item => 
            !doneItems[`${item.type}s`].some(
              done => done.courseId === course.id && done.itemId === item.id
            )
          ).length;

          const highPriorityCount = allItems.filter(item => 
            item.priorityScore >= 70 && 
            !doneItems[`${item.type}s`].some(
              done => done.courseId === course.id && done.itemId === item.id
            )
          ).length;

          if (prioritizedItems.length === 0) return null;

          return (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold">{getCleanCourseName(course.name)}</h3>
                <div className="flex items-center space-x-2">
                  {highPriorityCount > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs flex items-center">
                      <Flag size={14} className="mr-1" />
                      {highPriorityCount}
                    </span>
                  )}
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {undoneCount} due
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {activeFilter === 'urgent' && prioritizedItems.length === 0 ? (
                  <div className="text-center p-3 text-gray-500">No urgent items</div>
                ) : activeFilter === 'assignments' && prioritizedItems.length === 0 ? (
                  <div className="text-center p-3 text-gray-500">No assignments</div>
                ) : activeFilter === 'discussions' && prioritizedItems.length === 0 ? (
                  <div className="text-center p-3 text-gray-500">No discussions</div>
                ) : (
                  prioritizedItems.map((item) => {
                    const isDone = doneItems[`${item.type}s`].some(
                      done => done.courseId === course.id && done.itemId === item.id
                    );
                    const isHighPriority = item.priorityScore >= 70;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                          isDone ? 'bg-gray-50 opacity-70' :
                          isHighPriority ? 'bg-red-50 hover:bg-red-100' :
                          'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => onSelectItem(item.type, course, item)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              isDone ? 'line-through' : ''
                            }`}>
                              {item.name || item.title}
                            </span>
                            {isHighPriority && !isDone && (
                              <span className="bg-red-100 text-red-600 px-2 rounded-full text-xs">
                                Priority
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Due {formatDate(item.due_at)}
                            {item.points_possible > 0 && ` • ${item.points_possible} pts`}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsDone(item.type, course, item);
                          }}
                          className={`px-3 py-1 rounded-full text-xs ${
                            isDone ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {isDone ? 'Completed' : 'Mark Done'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DetailView = ({ selectedItem, onBack }) => {
  const [aiTips, setAiTips] = useState('Loading tips...');
  const { type, course, item } = selectedItem;

  useEffect(() => {
    const fetchAiTips = async () => {
      // Get the Canvas configuration
      const config = await new Promise((resolve) =>
        chrome.storage.sync.get(['canvasApiUrl', 'canvasApiToken', 'openaiApiKey'], resolve)
      );
      
      if (!config.openaiApiKey) {
        setAiTips('Configure OpenAI API for tips');
        return;
      }
      
      if (!config.canvasApiUrl || !config.canvasApiToken) {
        setAiTips('Configure Canvas API settings for enhanced tips');
        return;
      }

      // First fetch the modules for this course
      let moduleContent = [];
      try {
        const modulesResponse = await fetch(
          `${config.canvasApiUrl}/api/v1/courses/${course.id}/modules?include[]=items&per_page=100`,
          { headers: { Authorization: `Bearer ${config.canvasApiToken}` } }
        );
        
        if (!modulesResponse.ok) {
          throw new Error(`Failed to fetch modules: ${modulesResponse.status}`);
        }
        
        const modulesData = await modulesResponse.json();
        
        // Format module data in a way that's useful for the AI
        moduleContent = modulesData.map(module => ({
          id: module.id,
          name: module.name,
          items: (module.items || []).map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            url: item.html_url
          }))
        }));
        
        console.log('Fetched module data for AI tips:', moduleContent);
      } catch (error) {
        console.error('Error fetching module data:', error);
        // Continue even if module fetching fails
        moduleContent = [{ error: 'Failed to fetch module content' }];
      }

      // Create the prompt with module content
      const prompt = `Provide concise tips for completing this ${type}:
      Title: ${item.name || item.title}
      Course: ${course.name}
      Due: ${item.due_at ? formatDate(item.due_at) : 'No deadline'}
      ${item.description ? `Description: ${item.description.substring(0, 200)}` : ''}
      
      Course Modules:
      ${JSON.stringify(moduleContent, null, 2)}
      
      Based on the assignment title and the course modules above:
      1. Recommend specific modules to review
      2. Suggest which materials and resources would be most helpful
      3. Provide practical tips for completing the assignment
      
      IMPORTANT: If you don't have enough context or can't find relevant material in the modules provided, DO NOT make stretches or guesses. Instead, clearly indicate when you lack sufficient information with a simple note like "Insufficient context to make specific recommendations about [topic]".
      
      FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS with these EXACT headings and bullet points format:
      
      ## Modules to Review
      • [First bullet]
      • [Second bullet if applicable]
      • [Or "Insufficient module context" if not enough information is available]
      
      ## Materials and Resources
      • [First bullet]
      • [Second bullet if applicable]
      • [Or "Insufficient resource context" if not enough information is available]
      
      ## Practical Tips
      • [First general advice bullet]
      • [Second bullet]
      • [Third bullet if applicable]
      • [Fourth bullet if applicable]
      
      DO NOT deviate from this format. Use a dash or bullet point marker at the start of each list item.
      Keep each bullet point concise and easy to read at a glance.`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await response.json();
        setAiTips(data.choices?.[0]?.message?.content || 'No tips available');
      } catch (error) {
        console.error('Error fetching AI tips:', error);
        setAiTips('Error loading tips');
      }
    };

    fetchAiTips();
  }, [type, course, item]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft size={16} />
        Back to dashboard
      </button>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {type === 'assignment' ? 'Assignment Details' : 'Discussion Details'}
        </h2>
        <div className="grid gap-4">
          <div className="flex">
            <span className="font-medium w-24">Course:</span>
            <span>{getCleanCourseName(course.name)}</span>
          </div>
          <div className="flex">
            <span className="font-medium w-24">Title:</span>
            <span>{item.name || item.title}</span>
          </div>
          <div className="flex">
            <span className="font-medium w-24">Due Date:</span>
            <span>{formatDate(item.due_at)}</span>
          </div>
          {item.points_possible && (
            <div className="flex">
              <span className="font-medium w-24">Points:</span>
              <span>{item.points_possible}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-600 to-teal-500 rounded-xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-4">AI Tips</h3>
        <div className="text-sm space-y-4">
          <ReactMarkdown 
            className="markdown-content" 
            components={{
              h2: ({node, ...props}) => <h3 className="font-semibold text-white text-base mt-4 mb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2" {...props} />,
              li: ({node, ...props}) => <li className="text-white/90 pl-1 leading-relaxed" {...props} />,
              p: ({node, ...props}) => <p className="text-white/90 mb-2 leading-relaxed" {...props} />,
              a: ({node, ...props}) => <a className="text-white underline hover:text-blue-100" target="_blank" rel="noopener noreferrer" {...props} />
            }}
          >
            {aiTips}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const [doneItems, setDoneItems] = useState({
    assignments: [],
    discussions: [],
  });

  useEffect(() => {
    chrome.storage.local.get(['doneItems'], (result) => {
      if (result.doneItems) setDoneItems(result.doneItems);
    });
  }, []);

  const handleSelectItem = (type, course, item) => {
    chrome.storage.sync.get(['canvasApiUrl'], (config) => {
      if (!config.canvasApiUrl) {
        console.error('Canvas API URL is not configured.');
        return;
      }
      let url = '';
      if (type === 'assignment') {
        url = `${config.canvasApiUrl}/courses/${course.id}/assignments/${item.id}`;
      } else if (type === 'discussion') {
        // Correct URL format for discussions
        url = `${config.canvasApiUrl}/courses/${course.id}/discussion_topics/${item.id}`;
      }
      chrome.runtime.sendMessage({ action: 'openLink', url }, (response) => {
        console.log(`${type} openLink response:`, response);
      });
    });
    setSelectedItem({ type, course, item });
    setView('detail');
  };

  const markItemAsDone = (type, course, item) => {
    setDoneItems(prev => {
      const collection = `${type}s`;
      const existingIndex = prev[collection].findIndex(
        done => done.courseId === course.id && done.itemId === item.id
      );
      
      const updated = { ...prev };
      updated[collection] = existingIndex >= 0
        ? prev[collection].filter((_, i) => i !== existingIndex)
        : [...prev[collection], { courseId: course.id, itemId: item.id }];
      
      chrome.storage.local.set({ doneItems: updated });
      return updated;
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
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
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            Back to dashboard
          </button>
          <Options />
        </div>
      )}
    </div>
  );
};

export default App;
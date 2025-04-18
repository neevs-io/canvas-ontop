export const calculatePriorityScore = (item) => {
    if (!item.due_at) return 0;
    
    const now = new Date();
    const dueDate = new Date(item.due_at);
    const timeDiff = dueDate - now;
    
    // If due date is in the past, highest priority
    if (timeDiff < 0) return 100;
    
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
    let score = 0;
    
    // Time-based priority
    if (daysUntilDue <= 1) score += 50;
    else if (daysUntilDue <= 3) score += 40;
    else if (daysUntilDue <= 7) score += 30;
    else if (daysUntilDue <= 14) score += 20;
    
    // Points-based priority
    const points = item.points_possible || 0;
    if (points > 100) score += 30;
    else if (points > 50) score += 20;
    else if (points > 20) score += 10;
    
    // Additional factors
    if (item.has_submissions) score += 10; // If already started
    if (item.important_dates) score += 15; // If marked as important
    
    // Cap at 100
    return Math.min(100, score);
  };
  
  export const prioritizeItems = (items) => {
    return items
      .map(item => ({
        ...item,
        priorityScore: calculatePriorityScore(item)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  };
  
  export const getPriorityLabel = (score) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };
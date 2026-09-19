import {
  activityEvents,
  achievements,
  encouragements,
  initialAiMessages,
  initialTasks,
  notifications,
  participants,
  rankingEntries,
  reports,
  streak,
  titles,
} from "@/mocks";

export interface JourneyRepository {
  getParticipants(): Promise<typeof participants>;
  getTasks(): Promise<typeof initialTasks>;
  getActivity(): Promise<typeof activityEvents>;
  getRankings(): Promise<typeof rankingEntries>;
  getNotifications(): Promise<typeof notifications>;
}

// Swap this mock implementation for an HTTP-backed repository when services exist.
export const mockJourneyRepository: JourneyRepository = {
  async getParticipants() { return participants; },
  async getTasks() { return initialTasks; },
  async getActivity() { return activityEvents; },
  async getRankings() { return rankingEntries; },
  async getNotifications() { return notifications; },
};

export const mockJourneyData = { achievements, encouragements, initialAiMessages, reports, streak, titles };

import { Trip } from '@/state/trips';
import { getAlerts } from '@/api/nps';
import { ChatContext } from '@/api/chat';

export async function buildChatContext(trip?: Trip, signal?: AbortSignal): Promise<ChatContext> {
  const context: ChatContext = {};

  if (trip && trip.startDate && trip.endDate) {
    context.trip = {
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      stops: trip.stops.map((s) => ({
        parkName: s.parkName,
        parkCode: s.parkCode,
      })),
      notes: trip.stops[0]?.notes ? trip.stops[0].notes.substring(0, 300) : undefined,
    };

    // Fetch alerts for the trip's parks
    try {
      const parkCodes = trip.stops.map((s) => s.parkCode);
      const alertsPage = await getAlerts({ parkCodes, limit: 100 }, signal);

      // Filter to urgent alerts
      const urgentAlerts = alertsPage.items
        .filter(
          (alert) =>
            alert.category === 'Danger' || alert.category === 'Park Closure'
        )
        .slice(0, 5) // Top 5 only
        .map((alert) => ({
          id: alert.id,
          parkCode: alert.parkCode,
          title: alert.title,
          description: alert.description,
          category: alert.category,
        }));

      if (urgentAlerts.length > 0) {
        context.alerts = urgentAlerts;
      }
    } catch (err) {
      console.error('Failed to fetch alerts for chat context:', err);
      // Continue without alerts if fetch fails
    }
  }

  return context;
}

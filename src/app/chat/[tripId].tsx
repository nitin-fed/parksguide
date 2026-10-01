import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusView } from '@/components/ui';
import { ChatProvider } from '@/state/chat';
import { ChatView } from '@/components/ChatView';
import { useTrip } from '@/state/trips';
import { buildChatContext } from '@/lib/chatContext';
import { useState, useEffect } from 'react';
import { ChatContext } from '@/api/chat';

export default function TripChatScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = useTrip(tripId);
  const [context, setContext] = useState<ChatContext | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trip) {
      buildChatContext(trip).then((ctx) => {
        setContext(ctx);
        setLoading(false);
      });
    }
  }, [trip]);

  if (!trip) {
    return <StatusView empty="This trip no longer exists." />;
  }

  if (loading) {
    return <StatusView loading />;
  }

  return (
    <>
      <Stack.Screen options={{ title: `Ask about ${trip.name}` }} />
      <ChatProvider threadId={`trip-${tripId}`}>
        <ChatView context={context} tripId={tripId} />
      </ChatProvider>
    </>
  );
}

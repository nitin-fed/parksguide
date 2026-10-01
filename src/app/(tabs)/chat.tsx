import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from 'expo-router';
import { ChatProvider, useChat } from '@/state/chat';
import { ChatView } from '@/components/ChatView';
import { useTheme } from '@/theme';

function ChatHeader() {
  const c = useTheme();
  const navigation = useNavigation();
  const { clear, messages } = useChat();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        messages.length > 0 ? (
          <Pressable
            onPress={clear}
            style={{ marginRight: 16 }}
          >
            <Text style={{ color: c.primary, fontSize: 14, fontWeight: '600' }}>
              Clear
            </Text>
          </Pressable>
        ) : null,
    });
  }, [messages.length, clear, navigation, c.primary]);

  return <ChatView />;
}

export default function ChatScreen() {
  return (
    <ChatProvider threadId="general">
      <ChatHeader />
    </ChatProvider>
  );
}

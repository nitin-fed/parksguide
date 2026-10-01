import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatMessage, ChatContext } from '@/api/chat';
import { useChat } from '@/state/chat';
import { useTheme } from '@/theme';

const SUGGESTIONS = [
  'Best parks to visit in spring?',
  'What activities are available?',
  'Best time to visit?',
  'How long should I spend at each park?',
];

export function ChatView({ context, tripId }: { context?: ChatContext; tripId?: string }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, status, error, send, retry } = useChat();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || status === 'sending') return;

    const text = input.trim();
    setInput('');
    await send(text, context);
  };

  const handleSuggestion = async (text: string) => {
    setInput('');
    await send(text, context);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    return (
      <View
        key={`${item.role}-${index}`}
        style={[
          styles.messageBubble,
          {
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            backgroundColor: isUser ? c.primary : c.card,
            borderColor: c.border,
          },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isUser ? c.primaryText : c.text,
            },
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  const isEmpty = messages.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 10 : 0}
      >
        {/* Messages list */}
        {!isEmpty && (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(_, index) => index.toString()}
            inverted
            scrollEnabled
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 8,
            }}
            onScrollToIndexFailed={() => {}}
          />
        )}

        {/* Empty state with suggestions */}
        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={c.muted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>Ask about your trip</Text>
            <Text style={[styles.emptySubtitle, { color: c.muted }]}>
              Get recommendations and answers about National Parks
            </Text>

            <View style={styles.suggestionsContainer}>
              {SUGGESTIONS.map((text, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleSuggestion(text)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.suggestionText, { color: c.text }]}>{text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Typing indicator */}
        {status === 'sending' && (
          <View style={[styles.messageBubble, { backgroundColor: c.card, alignSelf: 'flex-start' }]}>
            <ActivityIndicator color={c.primary} size="small" />
          </View>
        )}

        {/* Error state */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: c.card, borderColor: c.danger }]}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={18} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
            <Pressable onPress={retry} style={[styles.errorButton, { backgroundColor: c.danger }]}>
              <Text style={[styles.errorButtonText, { color: c.primaryText }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimerContainer, { borderTopColor: c.border }]}>
          <Text style={[styles.disclaimerText, { color: c.muted }]}>
            ⚠️ AI can be wrong. Always verify important information with NPS.gov or a ranger.
          </Text>
        </View>

        {/* Input area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: c.card,
              borderTopColor: c.border,
              paddingBottom: insets.bottom || 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
              },
            ]}
            placeholder="Ask about parks..."
            placeholderTextColor={c.muted}
            value={input}
            onChangeText={setInput}
            editable={status !== 'sending'}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || status === 'sending'}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: !input.trim() || status === 'sending' ? c.muted : c.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons
              name="send"
              size={20}
              color={!input.trim() || status === 'sending' ? c.card : c.primaryText}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  suggestionsContainer: {
    marginTop: 32,
    gap: 12,
    width: '100%',
  },
  suggestionChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  errorButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  errorButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});

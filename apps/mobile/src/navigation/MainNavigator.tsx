import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatsScreen } from "../screens/main/ChatsScreen";
import { ChatScreen } from "../screens/main/ChatScreen";
import { NewChatScreen } from "../screens/main/NewChatScreen";
import { NewGroupScreen } from "../screens/main/NewGroupScreen";
import { SearchMessagesScreen } from "../screens/main/SearchMessagesScreen";
import { CallsScreen } from "../screens/main/CallsScreen";
import { UpdatesScreen } from "../screens/main/UpdatesScreen";
import { ContactsScreen } from "../screens/main/ContactsScreen";
import { SettingsScreen } from "../screens/main/SettingsScreen";
import { PrivacySettingsScreen } from "../screens/main/PrivacySettingsScreen";
import { BlockedUsersScreen } from "../screens/main/BlockedUsersScreen";
import { AboutScreen } from "../screens/main/AboutScreen";
import { AppearanceScreen } from "../screens/main/AppearanceScreen";
import { OfflineModeScreen } from "../screens/main/OfflineModeScreen";
import { useTheme } from "../theme/ThemeProvider";

export type MainTabParamList = {
  ChatsStack: undefined;
  Calls: undefined;
  Updates: undefined;
  Contacts: undefined;
  SettingsStack: undefined;
};

export type ChatsStackParamList = {
  Chats: undefined;
  Chat: { conversationId: string; title: string; avatarUrl?: string; isOnline?: boolean; peerId?: string };
  NewChat: undefined;
  NewGroup: undefined;
  SearchMessages: { conversationId: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
  PrivacySettings: undefined;
  BlockedUsers: undefined;
  About: undefined;
  Appearance: undefined;
  OfflineMode: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const ChatsStackNav = createNativeStackNavigator<ChatsStackParamList>();
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();

function ChatsStack() {
  return (
    <ChatsStackNav.Navigator>
      <ChatsStackNav.Screen name="Chats" component={ChatsScreen} options={{ headerShown: false }} />
      <ChatsStackNav.Screen name="Chat" component={ChatScreen} />
      <ChatsStackNav.Screen name="NewChat" component={NewChatScreen} options={{ title: "New chat", presentation: "modal" }} />
      <ChatsStackNav.Screen name="NewGroup" component={NewGroupScreen} options={{ title: "New group", presentation: "modal" }} />
      <ChatsStackNav.Screen name="SearchMessages" component={SearchMessagesScreen} options={{ title: "Search" }} />
    </ChatsStackNav.Navigator>
  );
}

function SettingsStack() {
  return (
    <SettingsStackNav.Navigator>
      <SettingsStackNav.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <SettingsStackNav.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ title: "Privacy" }} />
      <SettingsStackNav.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Blocked users" }} />
      <SettingsStackNav.Screen name="About" component={AboutScreen} options={{ title: "Help and about" }} />
      <SettingsStackNav.Screen name="Appearance" component={AppearanceScreen} options={{ title: "Appearance" }} />
      <SettingsStackNav.Screen name="OfflineMode" component={OfflineModeScreen} options={{ title: "Offline Mode" }} />
    </SettingsStackNav.Navigator>
  );
}

export function MainNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: { backgroundColor: theme.surfaceElevated, borderTopColor: theme.border },
      }}
    >
      <Tab.Screen name="ChatsStack" component={ChatsStack} options={{ title: "Chats" }} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Updates" component={UpdatesScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="SettingsStack" component={SettingsStack} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}

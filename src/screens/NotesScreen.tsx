import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius, fontFamily } from '../styles/theme';
import { Card, Button, Input } from '../components/ui';
import { Note } from '../types';

// Mock notes data
const mockNotes: Note[] = [
  {
    id: '1',
    userId: 'user1',
    title: 'Morning Reflection',
    content: 'Today I completed my workout and feel energized. Planning to read for 30 minutes this evening.',
    fontSize: 16,
    fontFamily: 'System',
    textColor: colors.gray[900],
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:15:00Z',
  },
  {
    id: '2',
    userId: 'user1',
    title: 'Task Ideas',
    content: 'Ideas for new tasks:\n- Morning meditation (10 min)\n- Evening walk\n- Weekly meal prep\n- Learn Spanish (30 min daily)',
    fontSize: 14,
    fontFamily: 'System',
    textColor: colors.primary[700],
    createdAt: '2024-01-14T18:30:00Z',
    updatedAt: '2024-01-14T18:45:00Z',
  },
  {
    id: '3',
    userId: 'user1',
    title: 'Streak Motivation',
    content: 'Remember: consistency is key! Small daily actions lead to big results. Keep going! 💪',
    fontSize: 18,
    fontFamily: 'System',
    textColor: colors.success[700],
    createdAt: '2024-01-13T12:00:00Z',
    updatedAt: '2024-01-13T12:05:00Z',
  },
];

const fontSizes = [12, 14, 16, 18, 20, 24];
const textColors = [
  { name: 'Black', value: colors.gray[900] },
  { name: 'Blue', value: colors.primary[700] },
  { name: 'Green', value: colors.success[700] },
  { name: 'Orange', value: colors.warning[700] },
  { name: 'Red', value: colors.danger[700] },
  { name: 'Gray', value: colors.gray[600] },
];

interface NoteEditorProps {
  note?: Note | null;
  visible: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, visible, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFontSize, setSelectedFontSize] = useState(16);
  const [selectedColor, setSelectedColor] = useState(colors.gray[900]);
  const [showFormatOptions, setShowFormatOptions] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedFontSize(note.fontSize);
      setSelectedColor(note.textColor);
    } else {
      setTitle('');
      setContent('');
      setSelectedFontSize(16);
      setSelectedColor(colors.gray[900]);
    }
  }, [note, visible]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your note.');
      return;
    }

    onSave({
      title: title.trim(),
      content: content.trim(),
      fontSize: selectedFontSize,
      fontFamily: 'System',
      textColor: selectedColor,
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.editorContainer}>
        {/* Editor Header */}
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editorTitle}>{note ? 'Edit Note' : 'New Note'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <View style={styles.titleSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="Note title..."
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Formatting Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolbarButton, showFormatOptions && styles.toolbarButtonActive]}
            onPress={() => setShowFormatOptions(!showFormatOptions)}
          >
            <Ionicons name="text" size={20} color={colors.gray[600]} />
            <Text style={styles.toolbarButtonText}>Format</Text>
          </TouchableOpacity>

          <View style={styles.toolbarSeparator} />
          
          <Text style={[styles.previewText, { fontSize: selectedFontSize, color: selectedColor }]}>
            Preview
          </Text>
        </View>

        {/* Format Options */}
        {showFormatOptions && (
          <Card style={styles.formatOptions} shadow="sm">
            {/* Font Size */}
            <View style={styles.formatSection}>
              <Text style={styles.formatLabel}>Font Size</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontSizeScroll}>
                {fontSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeOption,
                      selectedFontSize === size && styles.fontSizeOptionActive
                    ]}
                    onPress={() => setSelectedFontSize(size)}
                  >
                    <Text style={[
                      styles.fontSizeText,
                      selectedFontSize === size && styles.fontSizeTextActive
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Text Color */}
            <View style={styles.formatSection}>
              <Text style={styles.formatLabel}>Text Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                {textColors.map((color) => (
                  <TouchableOpacity
                    key={color.name}
                    style={[
                      styles.colorOption,
                      selectedColor === color.value && styles.colorOptionActive
                    ]}
                    onPress={() => setSelectedColor(color.value)}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: color.value }]} />
                    <Text style={styles.colorName}>{color.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Card>
        )}

        {/* Content Editor */}
        <ScrollView style={styles.contentContainer}>
          <TextInput
            style={[
              styles.contentInput,
              { fontSize: selectedFontSize, color: selectedColor }
            ]}
            placeholder="Start writing your note..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export const NotesScreen: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNote = () => {
    setEditingNote(null);
    setEditorVisible(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const handleSaveNote = (noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      // Update existing note
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === editingNote.id
            ? { ...note, ...noteData, updatedAt: new Date().toISOString() }
            : note
        )
      );
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        userId: 'user1',
        ...noteData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes(prevNotes => [newNote, ...prevNotes]);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderNote = ({ item: note }: { item: Note }) => (
    <Card style={styles.noteCard} shadow="sm">
      <TouchableOpacity onPress={() => handleEditNote(note)}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {note.title}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNote(note.id)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger[500]} />
          </TouchableOpacity>
        </View>
        
        <Text
          style={[
            styles.noteContent,
            { fontSize: note.fontSize, color: note.textColor }
          ]}
          numberOfLines={3}
        >
          {note.content}
        </Text>
        
        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>{formatDate(note.updatedAt)}</Text>
          <View style={styles.noteFormat}>
            <View style={[styles.colorIndicator, { backgroundColor: note.textColor }]} />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.gray[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Create your first note to get started'
            }
          </Text>
          {!searchQuery && (
            <Button
              title="Create Note"
              onPress={handleCreateNote}
              style={styles.emptyStateButton}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Note Editor Modal */}
      <NoteEditor
        note={editingNote}
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        onSave={handleSaveNote}
      />

      {/* Floating Add Notes Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateNote}>
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  notesList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  noteCard: {
    padding: spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  noteTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  noteContent: {
    marginBottom: spacing.sm,
    lineHeight: fontSize.base * 1.4,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  noteFormat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteFormatText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyStateButton: {
    paddingHorizontal: spacing.xl,
  },
  // Editor Styles
  editorContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  cancelButton: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  editorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  saveButton: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary[600],
  },
  titleSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  titleInput: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  toolbarButtonActive: {
    backgroundColor: colors.primary[100],
  },
  toolbarButtonText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  toolbarSeparator: {
    width: 1,
    height: 20,
    backgroundColor: colors.gray[300],
    marginHorizontal: spacing.md,
  },
  previewText: {
    fontWeight: '500',
  },
  formatOptions: {
    margin: spacing.md,
    padding: spacing.md,
  },
  formatSection: {
    marginBottom: spacing.md,
  },
  formatLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  fontSizeScroll: {
    flexDirection: 'row',
  },
  fontSizeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  fontSizeOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  fontSizeText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  fontSizeTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorOption: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  colorOptionActive: {
    backgroundColor: colors.gray[100],
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  colorName: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.lg,
  },
  contentInput: {
    flex: 1,
    padding: spacing.lg,
    textAlignVertical: 'top',
    minHeight: 200,
    lineHeight: fontSize.base * 1.4,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 90, // Just above the bottom navbar
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
}); 
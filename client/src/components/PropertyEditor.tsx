import { useState } from 'react';
import { Frontmatter } from '../utils/frontmatter';
import './PropertyEditor.css';

interface PropertyEditorProps {
  frontmatter: Frontmatter;
  onChange: (frontmatter: Frontmatter) => void;
}

export function PropertyEditor({ frontmatter, onChange }: PropertyEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');
  const [showAddProperty, setShowAddProperty] = useState(false);

  const tags = frontmatter.tags || [];

  const handleAddTag = () => {
    if (newTag.trim()) {
      const updatedTags = [...tags, newTag.trim()];
      onChange({ ...frontmatter, tags: updatedTags });
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const updatedTags = tags.filter((_, i) => i !== index);
    onChange({ ...frontmatter, tags: updatedTags });
  };

  const handlePropertyChange = (key: string, value: string) => {
    onChange({ ...frontmatter, [key]: value });
  };

  const handleRemoveProperty = (key: string) => {
    const newFrontmatter = { ...frontmatter };
    delete newFrontmatter[key];
    onChange(newFrontmatter);
  };

  const handleAddProperty = () => {
    if (newPropertyKey.trim()) {
      onChange({ ...frontmatter, [newPropertyKey.trim()]: newPropertyValue.trim() });
      setNewPropertyKey('');
      setNewPropertyValue('');
      setShowAddProperty(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="property-editor">
      <div className="property-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="property-toggle">{isOpen ? '▼' : '▶'}</span>
        <span className="property-title">プロパティ</span>
      </div>
      {isOpen && (
        <div className="property-content">
          {/* タグ */}
          <div className="property-row">
            <label className="property-label">タグ</label>
            <div className="property-value">
              <div className="tags-container">
                {tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      className="tag-remove"
                      onClick={() => handleRemoveTag(index)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input"
                  placeholder="タグを追加..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onBlur={handleAddTag}
                />
              </div>
            </div>
          </div>

          {/* 動的プロパティ一覧 */}
          {Object.entries(frontmatter)
            .filter(([key]) => key !== 'tags')
            .map(([key, value]) => (
              <div key={key} className="property-row">
                <label className="property-label">{key}</label>
                <div className="property-value property-value-with-delete">
                  {key === 'status' ? (
                    <select
                      className="property-select"
                      value={value as string || ''}
                      onChange={(e) => handlePropertyChange(key, e.target.value)}
                    >
                      <option value="">未設定</option>
                      <option value="進行中">進行中</option>
                      <option value="完了">完了</option>
                      <option value="保留">保留</option>
                      <option value="アーカイブ">アーカイブ</option>
                    </select>
                  ) : key === 'created' || key === 'updated' ? (
                    <input
                      type="date"
                      className="property-input"
                      value={value as string || ''}
                      onChange={(e) => handlePropertyChange(key, e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      className="property-input"
                      value={value as string || ''}
                      onChange={(e) => handlePropertyChange(key, e.target.value)}
                      placeholder={`${key}の値`}
                    />
                  )}
                  <button
                    className="property-delete"
                    onClick={() => handleRemoveProperty(key)}
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

          {/* 新規プロパティ追加 */}
          {showAddProperty ? (
            <div className="property-row property-add-row">
              <input
                type="text"
                className="property-key-input"
                placeholder="プロパティ名"
                value={newPropertyKey}
                onChange={(e) => setNewPropertyKey(e.target.value)}
              />
              <div className="property-value">
                <input
                  type="text"
                  className="property-input"
                  placeholder="値"
                  value={newPropertyValue}
                  onChange={(e) => setNewPropertyValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddProperty();
                    }
                  }}
                />
                <button className="property-add-confirm" onClick={handleAddProperty}>
                  追加
                </button>
                <button
                  className="property-add-cancel"
                  onClick={() => {
                    setShowAddProperty(false);
                    setNewPropertyKey('');
                    setNewPropertyValue('');
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button className="add-property-button" onClick={() => setShowAddProperty(true)}>
              + プロパティを追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}

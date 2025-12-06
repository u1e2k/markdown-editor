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

          {/* ステータス */}
          <div className="property-row">
            <label className="property-label">ステータス</label>
            <div className="property-value">
              <select
                className="property-select"
                value={frontmatter.status || ''}
                onChange={(e) => handlePropertyChange('status', e.target.value)}
              >
                <option value="">未設定</option>
                <option value="進行中">進行中</option>
                <option value="完了">完了</option>
                <option value="保留">保留</option>
                <option value="アーカイブ">アーカイブ</option>
              </select>
            </div>
          </div>

          {/* 作成日 */}
          <div className="property-row">
            <label className="property-label">作成日</label>
            <div className="property-value">
              <input
                type="date"
                className="property-input"
                value={frontmatter.created || ''}
                onChange={(e) => handlePropertyChange('created', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

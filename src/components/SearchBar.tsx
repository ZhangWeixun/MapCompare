import { useState, type FormEvent } from 'react';
import type { City, GeocodedCity, GeocodeProvider } from '../lib/types';
import { geocodeCity } from '../lib/geocode';

interface SearchBarProps {
  cities: City[];
  provider: GeocodeProvider;
  onProviderChange: (provider: GeocodeProvider) => void;
  /** 返回 null 表示添加成功；返回字符串为错误提示（如重复） */
  onAdd: (result: GeocodedCity) => string | null;
  onRemove: (id: string) => void;
}

export function SearchBar({ cities, provider, onProviderChange, onAdd, onRemove }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError(null);
    try {
      const result = await geocodeCity(q, provider);
      if (result === null) {
        setError('未找到该城市，试试英文地名或更具体的名称');
        return;
      }
      const addError = onAdd(result);
      if (addError) {
        setError(addError);
      } else {
        setQuery('');
      }
    } catch {
      setError('搜索失败，请检查网络后重试');
    } finally {
      setSearching(false);
    }
  }

  const placeholder =
    provider === 'photon' ? '城市名：国内用中文，国外用英文，如 上海 / Copenhagen' : '输入城市名，如：北京 / 哥本哈根 / Vancouver';

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} disabled={searching} />
        <button type="submit" disabled={searching || !query.trim()}>
          {searching ? '搜索中…' : '添加'}
        </button>
        <select
          className="provider-select"
          value={provider}
          onChange={(e) => onProviderChange(e.target.value as GeocodeProvider)}
          title="地名搜索数据源，按你的网络情况选择"
        >
          <option value="photon">Photon（国内直连）</option>
          <option value="nominatim">Nominatim（需外网）</option>
        </select>
      </form>
      {error && <div className="search-error">{error}</div>}
      {cities.length > 0 && (
        <div className="city-chips">
          {cities.map((c) => (
            <span key={c.id} className="city-chip" title={c.displayName}>
              {c.name}
              <button type="button" onClick={() => onRemove(c.id)} aria-label={`删除 ${c.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

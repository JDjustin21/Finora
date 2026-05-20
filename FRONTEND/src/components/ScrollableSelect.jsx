import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeText } from '../utils/formatters';

export default function ScrollableSelect({
  label,
  value,
  options = [],
  placeholder = 'Selecciona una opción',
  emptyMessage = 'No hay opciones disponibles',
  searchPlaceholder = 'Buscar...',
  getOptionValue,
  getOptionLabel,
  onChange,
  disabled = false,
  required = false,
}) {
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const selectedOption = useMemo(() => {
    return options.find((option) => {
      return String(getOptionValue(option)) === String(value);
    });
  }, [options, value, getOptionValue]);

  const filteredOptions = useMemo(() => {
    const searchValue = normalizeText(search);

    if (!searchValue) return options;

    return options.filter((option) => {
      return normalizeText(getOptionLabel(option)).includes(searchValue);
    });
  }, [options, search, getOptionLabel]);

  function updateDropdownPosition() {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownMaxHeight = Math.min(280, Math.max(180, spaceBelow - 16));

    setDropdownStyle({
      position: 'fixed',
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${dropdownMaxHeight}px`,
      zIndex: 9999,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    function handleWindowChange() {
      updateDropdownPosition();
    }

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideButton =
        containerRef.current && containerRef.current.contains(event.target);

      const clickedInsideDropdown =
        dropdownRef.current && dropdownRef.current.contains(event.target);

      if (!clickedInsideButton && !clickedInsideDropdown) {
        setOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleSelect(option) {
    onChange(getOptionValue(option));
    setOpen(false);
    setSearch('');
  }

  const dropdownContent =
    open && dropdownStyle
      ? createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          >
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />

            <div className="mt-2 overflow-y-auto pr-1" style={{ maxHeight: '220px' }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const optionValue = getOptionValue(option);
                  const isSelected = String(optionValue) === String(value);

                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={
                        isSelected
                          ? 'w-full rounded-xl bg-violet-50 px-3 py-2 text-left text-sm font-semibold text-violet-700'
                          : 'w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100'
                      }
                    >
                      {getOptionLabel(option)}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-3 text-sm font-medium text-slate-400">
                  {emptyMessage}
                </p>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
          {required ? ' *' : ''}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((currentValue) => !currentValue)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span className={selectedOption ? 'truncate' : 'truncate text-slate-400'}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>

        <span className="ml-2 text-slate-400">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {dropdownContent}
    </div>
  );
}
"use client";
import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode, SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string; disabled: boolean };
function text(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child)
    ? text(child.props.children) : String(child)).join("");
}
function optionsFrom(children: ReactNode): Option[] {
  const options: Option[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === Fragment) options.push(...optionsFrom(child.props.children));
    else if (child.type === "option") {
      const label = child.props.label ?? text(child.props.children);
      options.push({ label, value: String(child.props.value ?? label), disabled: !!child.props.disabled });
    }
  });
  return options;
}

/** Animated single-select with native form values and a keyboard-accessible popup. */
export default function AnimatedSelect({ children, className = "field", value, defaultValue, disabled, id, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = optionsFrom(children);
  const [localValue, setLocalValue] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const selectedValue = String(value ?? localValue);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selectedValue));
  const [menu, setMenu] = useState<{ style: CSSProperties; active: number } | null>(null);
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const typed = useRef({ value: "", time: 0 });
  const generatedId = useId();
  const listId = generatedId + "-options";
  const triggerId = id ?? generatedId;
  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"];
  const isOpen = menu !== null;
  const activeIndex = menu?.active;

  useEffect(() => {
    // Preserve implicit <label> names used by the existing admin forms.
    if (label || labelledBy) return;
    const surroundingLabel = trigger.current?.closest("label")?.cloneNode(true) as HTMLElement | undefined;
    surroundingLabel?.querySelectorAll("button, select").forEach(element => element.remove());
    const name = surroundingLabel?.textContent?.trim();
    if (name) trigger.current?.setAttribute("aria-label", name);
  }, [label, labelledBy]);

  useEffect(() => {
    if (!isOpen) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) setMenu(null);
    }
    function closeOnScroll(event: Event) {
      if (event.target instanceof Node && popup.current?.contains(event.target)) return;
      setMenu(null);
    }
    const close = () => setMenu(null);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex !== undefined) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  function open(active = selectedIndex) {
    const button = trigger.current;
    if (!button || button.matches(":disabled") || !options.length) return;
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const upward = below < 200 && above > below;
    setMenu({ active, style: {
      position: "fixed", left: rect.left, width: rect.width,
      maxHeight: Math.min(288, Math.max(40, upward ? above : below)),
      ...(upward ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      transformOrigin: upward ? "bottom center" : "top center",
    } });
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || !native.current || trigger.current?.matches(":disabled")) return;
    setLocalValue(option.value);
    // React receives the same real select change event as the previous native UI.
    native.current.value = option.value;
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
    setMenu(null);
    trigger.current?.focus();
  }
  function highlight(index: number) {
    if (menu) setMenu(previous => previous && { ...previous, active: index });
    else open(index);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab") { setMenu(null); return; }
    if (event.key === "Escape") { if (menu) event.preventDefault(); setMenu(null); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (menu) choose(menu.active); else open();
      return;
    }
    const available = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
    if (!available.length) return;
    const current = menu?.active ?? selectedIndex;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const position = available.indexOf(current);
      const next = event.key === "Home" ? available[0] : event.key === "End" ? available.at(-1)! :
        available[Math.max(0, Math.min(available.length - 1, position + (event.key === "ArrowDown" ? 1 : -1)))];
      highlight(next);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const query = (now - typed.current.time < 650 ? typed.current.value : "") + event.key.toLowerCase();
      typed.current = { value: query, time: now };
      const rotated = [...available.filter(i => i > current), ...available.filter(i => i <= current)];
      const next = rotated.find(i => options[i].label.toLowerCase().startsWith(query));
      if (next !== undefined) highlight(next);
    }
  }

  return <>
    <select {...props} ref={native} value={selectedValue} disabled={disabled} hidden aria-hidden="true" tabIndex={-1}>
      {children}
    </select>
    <button ref={trigger} id={triggerId} type="button" role="combobox" disabled={disabled}
      aria-label={label} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]}
      aria-invalid={props["aria-invalid"]} aria-required={props.required}
      aria-haspopup="listbox" aria-expanded={!!menu} aria-controls={listId}
      aria-activedescendant={menu ? `${listId}-${menu.active}` : undefined}
      className={`${className} animated-select`} onKeyDown={keyDown}
      onClick={() => menu ? setMenu(null) : open()} onBlur={() => setMenu(null)}>
      <span className="min-w-0 flex-1 truncate">{options[selectedIndex]?.label ?? "Select an option"}</span>
      <ChevronDown aria-hidden="true" size={16} className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${menu ? "rotate-180" : ""}`} />
    </button>
    {menu && createPortal(
      <div ref={popup} id={listId} role="listbox" aria-label={label ?? trigger.current?.getAttribute("aria-label") ?? "Options"}
        className="animated-select-menu overflow-y-auto overscroll-contain rounded-xl border border-edge bg-panel p-1 shadow-xl"
        style={menu.style} onPointerDown={event => event.preventDefault()}>
        {options.map((option, index) => <div key={`${option.value}-${index}`} id={`${listId}-${index}`} role="option"
          aria-selected={option.value === selectedValue} aria-disabled={option.disabled || undefined}
          className={`animated-select-option flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${option.disabled ? "cursor-not-allowed opacity-40" : index === menu.active ? "bg-emerald-500/15 text-emerald-400" : "hover:bg-ink"}`}
          style={{ animationDelay: `${Math.min(index * 20, 140)}ms` }}
          onPointerMove={() => { if (!option.disabled && menu.active !== index) highlight(index); }}
          onClick={() => choose(index)}>
          <span className="min-w-0 flex-1 break-words">{option.label}</span>
          {option.value === selectedValue && <Check size={15} aria-hidden="true" className="shrink-0 text-emerald-400" />}
        </div>)}
      </div>, document.body,
    )}
  </>;
}

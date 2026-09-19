/// <reference types="@webflow/designer-extension-typings" />

type AnyEl = Awaited<ReturnType<typeof webflow.getSelectedElement>>;

type ContainerEl = NonNullable<AnyEl> & {
  children: true;
  append: (
    preset: (typeof webflow.elementPresets)[keyof typeof webflow.elementPresets],
  ) => Promise<NonNullable<AnyEl>>;
  setStyles?: (styles: Style[]) => Promise<null>;
  styles?: boolean;
};

function requireContainer(el: AnyEl, label: string): ContainerEl {
  if (
    !el ||
    !("children" in el) ||
    !el.children ||
    typeof (el as { append?: unknown }).append !== "function"
  ) {
    throw new Error(`${label} cannot contain children.`);
  }
  return el as ContainerEl;
}

async function setAttr(el: AnyEl, name: string, value = "true"): Promise<void> {
  if (!el) return;
  // DOM / Custom Element uses setAttribute; native elements use setCustomAttribute
  if ("setAttribute" in el && typeof el.setAttribute === "function" && el.type === "DOM") {
    await el.setAttribute(name, value);
    return;
  }
  if ("customAttributes" in el && el.customAttributes) {
    await el.setCustomAttribute(name, value);
  }
}

async function appendDomInput(parent: ContainerEl): Promise<NonNullable<AnyEl>> {
  const input = await parent.append(webflow.elementPresets.DOM);
  if (!input || input.type !== "DOM") {
    throw new Error("Could not create search input Custom Element.");
  }
  await input.setTag("input");
  await input.setAttribute("type", "search");
  await input.setAttribute("name", "talaash-query");
  await input.setAttribute("placeholder", "Search…");
  await input.setAttribute("autocomplete", "off");
  await input.setAttribute("data-search-input", "true");
  return input;
}

async function setText(el: AnyEl, text: string): Promise<void> {
  if (!el) return;
  if ("textContent" in el && el.textContent) {
    await el.setTextContent(text);
  }
}

async function ensureHiddenStyle(): Promise<Style> {
  const name = "talaash-result-source";
  const existing = await webflow.getStyleByName(name);
  if (existing) return existing;
  const style = await webflow.createStyle(name);
  await style.setProperties({ display: "none" });
  return style;
}

async function resolveParent(): Promise<ContainerEl> {
  const selected = await webflow.getSelectedElement();
  if (selected && "children" in selected && selected.children) {
    return requireContainer(selected, "Selected element");
  }

  const all = await webflow.getAllElements();
  const body = all.find((el) => el.type === "Body");
  if (body && "children" in body && body.children) {
    return requireContainer(body, "Body");
  }

  throw new Error("Select a parent element on the canvas that can contain children.");
}

async function insertSearchLayout(): Promise<void> {
  const parent = await resolveParent();
  const hiddenStyle = await ensureHiddenStyle();

  const root = requireContainer(
    await parent.append(webflow.elementPresets.DivBlock),
    "Search root",
  );
  await setAttr(root, "data-search");

  // Custom Element <input> — not a Webflow Form (search.js binds Enter on the input)
  await appendDomInput(root);

  const answer = await root.append(webflow.elementPresets.Paragraph);
  await setAttr(answer, "data-search-answer");
  await setText(answer, "");

  const loading = await root.append(webflow.elementPresets.Paragraph);
  await setAttr(loading, "data-search-loading");
  await setText(loading, "Searching…");

  const empty = await root.append(webflow.elementPresets.Paragraph);
  await setAttr(empty, "data-search-empty");
  await setText(empty, "No results found.");

  const results = await root.append(webflow.elementPresets.DivBlock);
  await setAttr(results, "data-search-results");

  // Hidden result card template (must remain in published HTML → display:none, not Designer Visibility Hidden)
  const source = requireContainer(
    await root.append(webflow.elementPresets.DivBlock),
    "Result source",
  );
  await setAttr(source, "data-search-result-source");
  if (source.styles && source.setStyles) {
    await source.setStyles([hiddenStyle]);
  }

  const card = requireContainer(
    await source.append(webflow.elementPresets.LinkBlock),
    "Result card",
  );
  await setAttr(card, "data-search-result");

  const image = await card.append(webflow.elementPresets.Image);
  await setAttr(image, "data-search-result-image");

  const body = requireContainer(
    await card.append(webflow.elementPresets.DivBlock),
    "Result body",
  );

  const typeEl = await body.append(webflow.elementPresets.Paragraph);
  await setAttr(typeEl, "data-search-result-type");
  await setText(typeEl, "Type");

  const title = await body.append(webflow.elementPresets.Heading);
  await setAttr(title, "data-search-result-title");
  if (title && "setHeadingLevel" in title && typeof title.setHeadingLevel === "function") {
    try {
      await title.setHeadingLevel(3);
    } catch {
      /* ignore */
    }
  }
  await setText(title, "Result title");

  const snippet = await body.append(webflow.elementPresets.Paragraph);
  await setAttr(snippet, "data-search-result-snippet");
  await setText(snippet, "Result snippet");

  try {
    await webflow.setSelectedElement(root);
  } catch {
    /* optional */
  }
}

function setStatus(message: string, kind: "" | "ok" | "error" = ""): void {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("is-ok", "is-error");
  if (kind === "ok") el.classList.add("is-ok");
  if (kind === "error") el.classList.add("is-error");
}

async function onInsert(): Promise<void> {
  const btn = document.getElementById("insert-layout") as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
  setStatus("Inserting search layout…");

  try {
    await insertSearchLayout();
    setStatus("Search layout inserted. Style it, install the script from Setup, then publish.", "ok");
    try {
      await webflow.notify({
        type: "Success",
        message: "Talaash search layout inserted on the canvas.",
      });
    } catch {
      /* notify optional */
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not insert layout.";
    setStatus(message, "error");
    try {
      await webflow.notify({ type: "Error", message });
    } catch {
      /* ignore */
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

document.getElementById("insert-layout")?.addEventListener("click", () => {
  void onInsert();
});

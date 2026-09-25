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

type Placement = "inside-end" | "body-top" | "after";

function canHoldChildren(el: AnyEl): boolean {
  return Boolean(el && "children" in el && el.children);
}

function placementFor(el: AnyEl): Placement | null {
  if (!el) return null;
  if (el.type === "Body") return "body-top";
  return canHoldChildren(el) ? "inside-end" : "after";
}

async function elementLabel(el: NonNullable<AnyEl>): Promise<string> {
  if ("displayName" in el && el.displayName) {
    try {
      const name = await el.getDisplayName();
      if (name) return name;
    } catch {
      /* fall back to type */
    }
  }
  return el.type;
}

function describePlacement(placement: Placement, label: string): string {
  if (placement === "body-top") return "At the top of the page (first element in Body).";
  if (placement === "inside-end") return `Inside “${label}”, after its existing content.`;
  return `Directly below “${label}”.`;
}

async function createRoot(): Promise<{ root: ContainerEl; where: string }> {
  const selected = await webflow.getSelectedElement();
  const placement = placementFor(selected);
  if (!selected || !placement) {
    throw new Error("Select an element on the canvas first — the layout is added there.");
  }
  const label = await elementLabel(selected);
  const preset = webflow.elementPresets.DivBlock;

  let created: AnyEl;
  if (placement === "after") {
    created = await selected.after(preset);
  } else {
    const container = requireContainer(selected, label);
    const target = container as unknown as {
      prepend: (p: typeof preset) => Promise<AnyEl>;
      append: (p: typeof preset) => Promise<AnyEl>;
    };
    created = placement === "body-top" ? await target.prepend(preset) : await target.append(preset);
  }
  return {
    root: requireContainer(created, "Search layout"),
    where: describePlacement(placement, label),
  };
}

async function insertSearchLayout(): Promise<string> {
  const hiddenStyle = await ensureHiddenStyle();
  const { root, where } = await createRoot();
  if ("displayName" in root && root.displayName) {
    try {
      await (root as unknown as { setDisplayName: (n: string) => Promise<null> }).setDisplayName(
        "Talaash Search",
      );
    } catch {
      /* optional */
    }
  }
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
  return where;
}

async function updateTarget(el: AnyEl): Promise<void> {
  const target = document.getElementById("target");
  const btn = document.getElementById("insert-layout") as HTMLButtonElement | null;
  const placement = placementFor(el);
  if (!el || !placement) {
    if (target) target.textContent = "Nothing selected. Click an element on the canvas.";
    if (btn) btn.disabled = true;
    return;
  }
  const label = await elementLabel(el);
  if (target) target.textContent = describePlacement(placement, label);
  if (btn) btn.disabled = false;
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
    const where = await insertSearchLayout();
    setStatus(
      `Added “Talaash Search” — ${where} It’s now selected on the canvas and in the Navigator.`,
      "ok",
    );
    try {
      await webflow.notify({
        type: "Success",
        message: "Talaash search layout added and selected.",
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
    await updateTarget(await webflow.getSelectedElement().catch(() => null));
  }
}

document.getElementById("insert-layout")?.addEventListener("click", () => {
  void onInsert();
});

void webflow.setExtensionSize({ width: 420, height: 640 }).catch(() => undefined);
webflow.subscribe("selectedelement", (el) => {
  void updateTarget(el);
});
void webflow
  .getSelectedElement()
  .then(updateTarget)
  .catch(() => undefined);

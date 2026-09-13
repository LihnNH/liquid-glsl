const GROUPS = [
  {
    title: 'Base optics',
    items: [
      ['refractiveIndex', 'IOR', 1.0, 2.2, 0.01],
      ['refractionStrength', 'Refraction', 0, 120, 1],
      ['opticalBezelScale', 'Optical bezel', 0.1, 1.0, 0.01],
      ['chromaticDispersion', 'RGB dispersion', 0.0, 0.08, 0.001],
      ['blurStrength', 'Blur', 0.0, 1.0, 0.01],
      ['blurRadius', 'Blur radius', 0.0, 24.0, 0.5]
    ]
  },
  {
    title: 'Light and material',
    items: [
      ['glassTint', 'Tint', 0.0, 0.18, 0.001],
      ['rimWidth', 'Rim width', 0.0, 4.0, 0.05],
      ['specularStrength', 'Specular', 0.0, 1.5, 0.01],
      ['specularSharpness', 'Sharpness', 1.0, 20.0, 0.1],
      ['lightAngleDegrees', 'Light angle', -180.0, 180.0, 1.0],
      ['activationDurationMs', 'Activation ms', 60, 600, 1]
    ]
  }
];

const SHAPE_GROUPS = [
  {
    title: 'Draggable pill',
    shape: 'freeGlass',
    items: [
      ['width', 'Width', 80, 320, 1],
      ['height', 'Height', 48, 180, 1],
      ['bezel', 'Bezel', 4, 80, 1]
    ]
  },
  {
    title: 'Draggable ball',
    shape: 'ball',
    items: [
      ['diameter', 'Diameter', 48, 220, 1],
      ['bezel', 'Bezel', 4, 90, 1]
    ]
  }
];

function formatValue(value, step) {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return Number(value).toFixed(decimals);
}

function makeGlassRow(key, label, min, max, step, state, onChange) {
  const row = document.createElement('label');
  row.className = 'control-row';
  const meta = document.createElement('div');
  meta.className = 'control-meta';
  const title = document.createElement('span');
  title.className = 'control-label';
  title.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'control-value';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(state.glass[key]);

  const sync = () => {
    valueEl.textContent = formatValue(input.value, step);
    state.glass[key] = Number(input.value);
    onChange();
  };

  input.addEventListener('input', sync);
  meta.append(title, valueEl);
  row.append(meta, input);
  sync();
  return row;
}

function makeShapeRow(shapeKey, key, label, min, max, step, state, onChange) {
  const row = document.createElement('label');
  row.className = 'control-row';
  const meta = document.createElement('div');
  meta.className = 'control-meta';
  const title = document.createElement('span');
  title.className = 'control-label';
  title.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'control-value';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(state[shapeKey][key]);

  const sync = () => {
    valueEl.textContent = formatValue(input.value, step);
    state[shapeKey][key] = Number(input.value);
    onChange();
  };

  input.addEventListener('input', sync);
  meta.append(title, valueEl);
  row.append(meta, input);
  sync();
  return row;
}

export function mountControls(root, state, onChange) {
  root.textContent = '';

  for (const groupDef of GROUPS) {
    const group = document.createElement('section');
    group.className = 'control-group';
    const heading = document.createElement('h2');
    heading.textContent = groupDef.title;
    group.append(heading);
    for (const [key, label, min, max, step] of groupDef.items) {
      group.append(makeGlassRow(key, label, min, max, step, state, onChange));
    }
    root.append(group);
  }

  for (const groupDef of SHAPE_GROUPS) {
    const group = document.createElement('section');
    group.className = 'control-group';
    const heading = document.createElement('h2');
    heading.textContent = groupDef.title;
    group.append(heading);
    for (const [key, label, min, max, step] of groupDef.items) {
      group.append(makeShapeRow(groupDef.shape, key, label, min, max, step, state, onChange));
    }
    root.append(group);
  }
}

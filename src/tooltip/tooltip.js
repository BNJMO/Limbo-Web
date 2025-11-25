export function createTooltip({
  className = "control-tooltip",
  defaultMessage = "",
  visibleClass = "is-visible",
  hideDelay = 3000,
  role = "alert",
} = {}) {
  let hideHandle = null;
  const element = document.createElement("div");
  element.className = className;
  if (role) {
    element.setAttribute("role", role);
  }
  if (defaultMessage) {
    element.textContent = defaultMessage;
  }

  function hide() {
    element.classList.remove(visibleClass);
    if (hideHandle) {
      clearTimeout(hideHandle);
      hideHandle = null;
    }
  }

  function show(message = defaultMessage) {
    element.textContent = message;
    element.classList.add(visibleClass);
    if (hideHandle) {
      clearTimeout(hideHandle);
    }
    hideHandle = setTimeout(() => {
      element.classList.remove(visibleClass);
      hideHandle = null;
    }, hideDelay);
  }

  return {
    element,
    show,
    hide,
  };
}

/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ItemRow } from "../ItemRow";

function baseItem(overrides = {}) {
  return {
    id: "1",
    type: "test",
    title: "Math test",
    short: "16.3",
    full: "Tuesday, 16.3.2027",
    detail: {},
    ...overrides,
  };
}

describe("ItemRow", () => {
  it("shows the Hebrew kind label for its type", () => {
    render(<ItemRow item={baseItem({ type: "holiday" })} />);
    expect(screen.getByText("חג / חופשה")).toBeInTheDocument();
  });

  it("shows no reminder badges when no flags are set", () => {
    render(<ItemRow item={baseItem()} />);
    expect(screen.queryByTitle("יש להביא חולצה לבנה")).not.toBeInTheDocument();
    expect(screen.queryByTitle("יש להביא אוכל")).not.toBeInTheDocument();
    expect(screen.queryByTitle("יש צורך באישור הורים")).not.toBeInTheDocument();
  });

  it("shows the parent-signature badge only when required-parent-signature is true", () => {
    render(<ItemRow item={baseItem({ "required-parent-signature": true })} />);
    expect(screen.getByTitle("יש צורך באישור הורים")).toBeInTheDocument();
    expect(screen.queryByTitle("יש להביא חולצה לבנה")).not.toBeInTheDocument();
    expect(screen.queryByTitle("יש להביא אוכל")).not.toBeInTheDocument();
  });

  it("shows the white-shirt badge only when required-white-shirt is true", () => {
    render(<ItemRow item={baseItem({ "required-white-shirt": true })} />);
    expect(screen.getByTitle("יש להביא חולצה לבנה")).toBeInTheDocument();
    expect(screen.queryByTitle("יש להביא אוכל")).not.toBeInTheDocument();
  });

  it("shows the food badge only when required-food is true", () => {
    render(<ItemRow item={baseItem({ "required-food": true })} />);
    expect(screen.getByTitle("יש להביא אוכל")).toBeInTheDocument();
    expect(screen.queryByTitle("יש להביא חולצה לבנה")).not.toBeInTheDocument();
  });

  it("shows all badges when all flags are true", () => {
    render(
      <ItemRow
        item={baseItem({
          "required-white-shirt": true,
          "required-food": true,
          "required-parent-signature": true,
        })}
      />
    );
    expect(screen.getByTitle("יש להביא חולצה לבנה")).toBeInTheDocument();
    expect(screen.getByTitle("יש להביא אוכל")).toBeInTheDocument();
    expect(screen.getByTitle("יש צורך באישור הורים")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OnboardingForm } from "@/components/onboarding-form";

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Lose fat" }));
  await user.type(screen.getByLabelText(/age/i), "30");
  await user.type(screen.getByLabelText(/height/i), "180");
  await user.type(screen.getByLabelText(/current weight/i), "80");
  await user.click(screen.getByRole("radio", { name: /moderately active/i }));
  await user.click(screen.getByRole("radio", { name: /^male$/i }));
  await user.click(screen.getByRole("button", { name: /calculate estimate/i }));
}

describe("OnboardingForm", () => {
  it("shows validation errors when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm userId="user-a" />);
    await user.click(screen.getByRole("button", { name: /calculate estimate/i }));
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(screen.getByText(/choose a goal/i)).toBeInTheDocument();
  });

  it("shows the fixture estimate on the review step", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm userId="user-a" />);
    await fillDetails(user);
    expect(await screen.findByDisplayValue("2345")).toBeInTheDocument();
    expect(screen.getByDisplayValue("128")).toBeInTheDocument();
    expect(screen.getByDisplayValue("312")).toBeInTheDocument();
    expect(screen.getByDisplayValue("65")).toBeInTheDocument();
  });

  it("surfaces save errors without navigating", async () => {
    const user = userEvent.setup();
    const saveProfile = vi.fn(async () => ({ error: "write blocked" }));
    render(<OnboardingForm userId="user-a" saveProfile={saveProfile} />);
    await fillDetails(user);
    await user.click(await screen.findByRole("button", { name: /save targets/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/write blocked/i);
    expect(saveProfile).toHaveBeenCalledOnce();
  });

  it("prepopulates a completed profile and keeps the original onboarded_at", async () => {
    const user = userEvent.setup();
    const saveProfile = vi.fn(async () => ({ error: null }));
    render(
      <OnboardingForm
        userId="user-a"
        saveProfile={saveProfile}
        initialProfile={{
          id: "user-a",
          sex: "male",
          age: 30,
          height_cm: 180,
          weight_kg: 80,
          activity_level: "moderate",
          goal: "lose",
          calorie_target: 2345,
          protein_g: 128,
          carbs_g: 312,
          fat_g: 65,
          onboarded_at: "2026-10-22T00:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByDisplayValue("2345")).toBeInTheDocument();
    expect(screen.getByDisplayValue("128")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /edit your targets/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save targets/i }));
    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-a",
        calorie_target: 2345,
        onboarded_at: "2026-10-22T00:00:00.000Z",
      }),
    );
  });

  it("saves a profile keyed to the signed-in user", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const saveProfile = vi.fn(async () => ({ error: null }));
    render(
      <OnboardingForm userId="user-a" saveProfile={saveProfile} onSaved={onSaved} />,
    );
    await fillDetails(user);
    await user.click(await screen.findByRole("button", { name: /save targets/i }));
    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-a",
        goal: "lose",
        calorie_target: 2345,
        protein_g: 128,
      }),
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });
});

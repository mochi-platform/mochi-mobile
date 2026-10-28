import { act, render, screen } from "@testing-library/react-native";
import NetInfo from "@react-native-community/netinfo";
import { OfflineBanner } from "../OfflineBanner";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

describe("OfflineBanner", () => {
  it("aparece solo sin conexión", () => {
    let emit: (state: { isConnected: boolean | null }) => void = () => {};
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      emit = cb;
      return () => {};
    });
    render(<OfflineBanner />);
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
    act(() => emit({ isConnected: false }));
    expect(screen.getByText(/Sin conexión/)).toBeTruthy();
    act(() => emit({ isConnected: true }));
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });
});

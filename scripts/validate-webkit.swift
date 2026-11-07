import AppKit
import WebKit
let app = NSApplication.shared
Task { @MainActor in
    do {
        let ext = try await WKWebExtension(resourceBaseURL: URL(fileURLWithPath: FileManager.default.currentDirectoryPath + "/extension", isDirectory: true))
        // Force lazy manifest parsing before inspecting all validation errors.
        _ = ext.requestedPermissions
        _ = ext.allRequestedMatchPatterns
        _ = ext.hasBackgroundContent
        _ = ext.icon(for: CGSize(width: 128, height: 128))
        let context = WKWebExtensionContext(for: ext)
        let commands = context.commands
        for command in commands { print("Command:", command.id, String(describing: command.activationKey), command.modifierFlags) }
        if !ext.errors.isEmpty { for error in ext.errors { print(error) }; exit(1) }
        print("WebKit manifest, permissions, resources, and commands: OK")
        exit(0)
    } catch { print(error); exit(1) }
}
app.run()

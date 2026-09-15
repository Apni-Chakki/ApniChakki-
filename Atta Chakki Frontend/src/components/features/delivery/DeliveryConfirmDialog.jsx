import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../common/dialog";
import { Button } from "../../common/button";
import { CheckCircle } from "lucide-react";

export const DeliveryConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  t = (s) => s,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            {title}
          </DialogTitle>
          <DialogDescription className="py-2 text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none"
            onClick={() => onOpenChange(false)}
          >
            {t("Cancel")}
          </Button>
          <Button 
            className="flex-1 sm:flex-none bg-success hover:bg-success/90"
            onClick={() => {
              if (onConfirm) onConfirm();
              onOpenChange(false);
            }}
          >
            {t("Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryConfirmDialog;
